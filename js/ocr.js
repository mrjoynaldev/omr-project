// OCR + parsing. AI extracts structure only; never sets answer key.
function loadScript(src){ return new Promise((res,rej)=>{ if(document.querySelector('script[data-src="'+src+'"]')) return res(); const s=document.createElement('script'); s.src=src; s.dataset.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
export async function extractTextFromFile(file, onProgress){
  const ext=(file.name||'').toLowerCase();
  onProgress && onProgress('Reading file...', 10);
  if(file.type.startsWith('image/')){
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const { createWorker } = window.Tesseract;
    const worker = await createWorker('eng');
    onProgress && onProgress('Reading question paper...', 40);
    const { data } = await worker.recognize(file);
    await worker.terminate();
    onProgress && onProgress('Almost done...', 90);
    return { text:data.text||'', method:'ocr-image' };
  }
  if(file.type==='application/pdf' || ext.endsWith('.pdf')){
    try{
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      const buf=await file.arrayBuffer();
      const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
      let out='';
      for(let p=1;p<=Math.min(pdf.numPages,20);p++){ onProgress && onProgress('Reading question paper... '+(p)+'/'+(pdf.numPages), 20+p*3); const pg=await pdf.getPage(p); const tc=await pg.getTextContent(); out+='\n'+tc.items.map(i=>i.str).join(' '); }
      if(out.trim().length>50) return { text:out, method:'pdf-text' };
    }catch(e){ /* fallthrough to OCR */ }
    throw new Error('Image-only PDF. Please export as clear images (one photo per page) and retry. Tip: keep entire page visible, good light.');
  }
  if(ext.endsWith('.docx')){
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    const buf=await file.arrayBuffer();
    const r=await window.mammoth.extractRawText({arrayBuffer:buf});
    return { text:r.value||'', method:'docx-text' };
  }
  if(file.type.startsWith('text/')) return { text:await file.text(), method:'text' };
  throw new Error('Unsupported document. Please upload a photo (JPG/PNG), PDF, DOCX or TXT.');
}
// Parse Q numbers + A/B/C/D options. Marks uncertain blocks for review.
export function parseQuestions(raw, totalQ){
  const text=(raw||'').replace(/\r/g,'\n');
  const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
  const qs=[]; let cur=null;
  const qStart=/^(?:Q(?:uestion)?\.?\s*)?(\d{1,3})[\).\:\-\s]+(.{3,})/i;
  const optRe=/^\(?([A-Da-d])[\)\.\:\-\s]+(.+)/;
  const inlineOpt=/\b([A-D])[\).\:\-]\s*([^A-D]{2,}?)(?=\s+[B-D][\).\:\-]|$)/g;
  function push(){ if(cur) qs.push(cur); cur=null; }
  for(const ln of lines){
    const qm=ln.match(qStart);
    const om=ln.match(optRe);
    if(qm && !om){
      push();
      cur={ n:parseInt(qm[1],10), text:qm[2].trim(), options:['','','',''], raw:ln, low:false, ai:true };
      // inline options like A. x B. y C. z D. w
      const opts=[...ln.matchAll(inlineOpt)];
      if(opts.length>=2){ opts.slice(0,4).forEach((m,i)=>{ const idx='ABCD'.indexOf(m[1].toUpperCase()); if(idx>=0) cur.options[idx]=m[2].trim(); }); }
    } else if(om && cur){
      const idx='ABCD'.indexOf(om[1].toUpperCase());
      cur.options[idx]=om[2].trim();
    } else if(cur){
      if(cur.text.length<400) cur.text+=' '+ln; else cur.low=true;
    }
  }
  push();
  qs.forEach(q=>{ const filled=q.options.filter(o=>o&&o.length>1).length; if(filled<4) q.low=true; if(!q.text||q.text.length<3) q.low=true; });
  qs.sort((a,b)=>a.n-b.n);
  // pad / trim to totalQ but keep extracted numbers visible
  const out=[];
  for(let i=0;i<(totalQ||qs.length||20);i++){ const e=qs[i]; if(e) out.push({n:i+1,text:e.text,options:e.options,confirmed:false,ai:true,low:e.low}); else out.push({n:i+1,text:'',options:['','','',''],confirmed:false,ai:false,low:true}); }
  return out;
}
