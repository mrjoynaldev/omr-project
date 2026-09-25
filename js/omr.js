// OMR sheet generator: high-contrast, scan-first. Print to PDF via browser.
export function omrHTML(test){
  const rows=test.questions.map(q=>{
    return '<div class="omr-row"><strong style="min-width:34px"> '+(q.n)+'.</strong>'+['A','B','C','D'].map(L=>'<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="display:inline-block;width:18px;height:18px;border:2px solid #111;border-radius:50%"></span> '+L+'</span>').join('')+'</div>';
  }).join('');
  return '<div class="omr-sheet">'
  +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
  +'<div class="marker" aria-hidden="true"></div>'
  +'<div style="text-align:center;flex:1"><h2 style="margin:0">'+esc(test.name)+'</h2><div>'+esc(test.subject)+' — Class '+esc(test.klass)+' '+esc(test.section||'')+' — '+test.questions.length+' Q x '+test.marksPerQ+' marks'+(test.negMark?' — Negative '+test.negMark:'')+'</div></div>'
  +'<div class="marker" aria-hidden="true"></div></div>'
  +'<hr style="border:1px solid #111"/>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:14px">'
  +'<div>Name: ____________________________</div><div>Roll: __________</div>'
  +'<div>Class: __________ Sec: __________</div><div>Date: __________</div></div>'
  +'<p style="font-size:13px"><b>Instructions:</b> Use blue/black ball pen. Fill one bubble fully per question. For correction, ask invigilator. Keep sheet flat, do not fold markers.</p>'
  +'<div class="omr-grid">'+rows+'</div>'
  +'<div style="display:flex;justify-content:space-between;margin-top:14px"><div class="marker"></div><div style="font-size:12px">Invigilator sign: __________ &nbsp; ID:'+test.id.slice(-6)+'</div><div class="marker"></div></div>'
  +'</div>';
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
export function printOMR(test){
  const root=document.getElementById('printRoot');
  root.innerHTML=omrHTML(test);
  window.print();
}
export function answerKeyOMRHTML(test){
  return omrHTML(Object.assign({}, test, {name:test.name+' — ANSWER KEY (teacher only)'}));
}
