import * as Store from './store.js';
import { extractTextFromFile, parseQuestions } from './ocr.js';
import { printOMR, answerKeyOMRHTML } from './omr.js';
import { startCamera, stopStream, fileToImage, drawCover, qualityHints, analyze } from './scan.js';
import { mark } from './marking.js';
import { exportCSV, exportXLSX, printResults } from './export.js';
const $=s=>document.querySelector(s);
const view=()=>document.getElementById('view');
let db=Store.load();
function toast(m){ const t=document.getElementById('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),3200); }
function nav(){ const h=location.hash||'#/dashboard'; document.querySelectorAll('[data-nav]').forEach(a=>{ const k=a.dataset.nav; a.classList.toggle('active', h.includes(k)); }); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function go(h){ location.hash=h; }
function hdr(t,sub){ return '<h1>'+esc(t)+'</h1>'+(sub?'<p class="muted">'+esc(sub)+'</p>':''); }
function testCard(t){ const n=t.submissions.length; return '<a class="row-card" href="#/test/'+t.id+'"><div><strong>'+esc(t.name)+'</strong><span class="muted small">'+esc(t.subject)+' — Class '+esc(t.klass)+' — '+t.questions.length+' Q — '+n+' evaluated</span></div><span>›</span></a>'; }
// ---------- ROUTER ----------
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', ()=>{ if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); } if(!location.hash) location.hash='#/dashboard'; route(); });
async function route(){ nav(); const h=location.hash||'#/dashboard'; const v=view(); v.innerHTML=''; window.scrollTo(0,0);
  if(h.startsWith('#/create')) return uiCreate(v);
  if(h.startsWith('#/tests')) return uiTests(v);
  if(h.startsWith('#/results')) return uiResultsAll(v);
  if(h.startsWith('#/settings')) return uiSettings(v);
  if(h.startsWith('#/test/')) return uiTest(v, h.split('/')[2]);
  if(h.startsWith('#/review/')) return uiReview(v, h.split('/')[2]);
  if(h.startsWith('#/answerkey/')) return uiKey(v, h.split('/')[2]);
  if(h.startsWith('#/omr/')) return uiOMR(v, h.split('/')[2]);
  if(h.startsWith('#/scan/')) return uiScan(v, h.split('/')[2]);
  if(h.startsWith('#/result/')) return uiResult(v, h.split('/')[2]);
  return uiDash(v);
}
// ---------- DASHBOARD ----------
function uiDash(v){ const ts=db.tests.slice(0,5);
  v.innerHTML=hdr('Dashboard','Create a test, scan OMR sheets, get marks — without repetitive checking.')
  +'<div class="card"><a class="btn btn-primary" href="#/create">+ Create Test</a><div class="btn-row"><a class="btn btn-ghost" href="#/tests">My Tests</a><a class="btn btn-ghost" href="#/results">Results</a></div></div>'
  +'<h2>Recent Tests</h2><div class="list">'+(ts.length? ts.map(testCard).join('') : '<div class="card muted">No tests yet. Tap Create Test to start.</div>')+'</div>';
}
// ---------- CREATE ----------
function uiCreate(v){
  v.innerHTML=hdr('Create Test','Step 1 of 7 — test details')
  +'<div class="card"><label class="fl">Test name</label><input id="f_n" placeholder="e.g. Mathematics Unit 2"/>'
  +'<div class="grid2"><div><label class="fl">Subject</label><input id="f_s" placeholder="Mathematics"/></div><div><label class="fl">Class</label><input id="f_c" placeholder="8"/></div></div>'
  +'<div class="grid2"><div><label class="fl">Total questions</label><input id="f_q" type="number" value="20" min="1" max="200"/></div><div><label class="fl">Marks per question</label><input id="f_m" type="number" value="1" step="0.25"/></div></div>'
  +'<label class="fl">Negative marking (optional)</label><input id="f_neg" type="number" value="0" step="0.25"/>'
  +'<div class="btn-row"><button class="btn btn-primary" id="go">Continue — Add question paper</button></div></div>';
  $('#go').onclick=()=>{ const t=Store.createTest(db,{name:$('#f_n').value.trim()||'Untitled test',subject:$('#f_s').value.trim(),klass:$('#f_c').value.trim(),totalQ:$('#f_q').value,marksPerQ:$('#f_m').value,negMark:$('#f_neg').value}); Store.save(db); go('#/test/'+t.id); };
}
// ---------- TEST OVERVIEW + UPLOAD ----------
function uiTest(v,id){ const t=Store.getTest(db,id); if(!t){ v.innerHTML='<div class="card">Test not found.</div>'; return; }
  const done=t.questions.filter(q=>q.confirmed).length;
  v.innerHTML=hdr(t.name, t.subject+' — Class '+t.klass+' — '+t.questions.length+' questions')
  +'<div class="kpi"><div class="card"><strong>'+done+'/'+t.questions.length+'</strong><div class="muted small">Questions confirmed</div></div><div class="card"><strong>'+t.submissions.length+'</strong><div class="muted small">Students evaluated</div></div><div class="card"><strong>'+Object.keys(t.answerKey).length+'</strong><div class="muted small">Answer key set</div></div></div>'
  +'<div class="card"><h3>Step 2 — Add existing question paper</h3><p class="muted small">Upload photo, PDF or Word. We extract questions; <b>you confirm everything</b>.</p>'
  +'<input id="up" type="file" accept="image/*,.pdf,.docx,.txt" multiple /><div class="progress" style="margin-top:8px"><i id="pb"></i></div><p id="st" class="muted small"></p><div id="ocrOut"></div></div>'
  +'<div class="btn-row"><a class="btn btn-primary" href="#/review/'+t.id+'">Review questions ('+done+'/'+t.questions.length+')</a><a class="btn btn-ghost" href="#/answerkey/'+t.id+'">Answer key</a></div>'
  +'<div class="btn-row"><a class="btn btn-ghost" href="#/omr/'+t.id+'">Generate OMR</a><a class="btn btn-teal" href="#/scan/'+t.id+'">Scan Answers</a><a class="btn btn-ghost" href="#/result/'+t.id+'">Results</a></div>';
  $('#up').onchange=async e=>{
    const files=[...e.target.files]; if(!files.length) return;
    for(const f of files){
      try{ $('#st').textContent='Uploading...'; $('#pb').style.width='15%';
        const r=await extractTextFromFile(f,(m,p)=>{ $('#st').textContent=m; $('#pb').style.width=p+'%'; });
        const parsed=parseQuestions(r.text, t.totalQ);
        t.questions=parsed; t.status='ocr_done'; Store.logAudit(t,'ocr_extract',f.name+' via '+r.method); Store.save(db);
        $('#ocrOut').innerHTML='<p><span class="pill ai">AI suggestion</span> Extracted '+parsed.length+' questions from '+esc(f.name)+'. Please review — AI can be wrong.</p>';
        toast('Extracted — please review'); go('#/review/'+t.id); return;
      }catch(err){ $('#st').innerHTML='<span class="pill err">Could not read</span> '+esc(err.message||'OCR failed. Try a clearer photo with the full page visible.'); }
    }
  };
}
// ---------- REVIEW ----------
function uiReview(v,id){ const t=Store.getTest(db,id); if(!t) return;
  v.innerHTML=hdr('Review questions','AI extraction is only a suggestion. Confirm each question. Accuracy matters more than speed.')
  +'<div class="btn-row no-print"><button class="btn btn-ghost" id="addQ">+ Add question manually</button><button class="btn btn-primary" id="done">Confirm all visible</button></div><div id="ql"></div>'
  +'<div class="btn-row"><a class="btn btn-primary" href="#/answerkey/'+t.id+'">Continue — Answer key</a></div>';
  const box=$('#ql');
  function render(){ box.innerHTML=t.questions.map((q,i)=>'<div class="qcard"><div class="qhead"><strong>Q'+q.n+'</strong><span>'+(q.confirmed?'<span class="pill ok">Teacher-confirmed</span>':q.ai?'<span class="pill ai">AI suggestion — needs check</span>':'<span class="pill warn">Manual</span>')+(q.low?' <span class="pill warn">Check carefully</span>':'')+'</span></div>'
    +'<label class="fl">Question</label><textarea data-i="'+i+'" data-k="text">'+esc(q.text)+'</textarea>'
    +q.options.map((o,oi)=>'<label class="fl">Option '+'ABCD'[oi]+'</label><input data-i="'+i+'" data-k="o'+oi+'" value="'+esc(o)+'"/>').join('')
    +'<div class="btn-row"><button class="btn btn-ghost" data-a="ok" data-i="'+i+'">'+(q.confirmed?'Confirmed ✓':'Confirm')+'</button><button class="btn btn-ghost" data-a="del" data-i="'+i+'">Delete</button></div></div>').join('');
    box.querySelectorAll('textarea,input').forEach(el=>{ el.onchange=()=>{ const i=+el.dataset.i,k=el.dataset.k; if(k==='text') t.questions[i].text=el.value; else t.questions[i].options[+k.slice(1)]=el.value; t.questions[i].confirmed=false; Store.save(db); }; });
    box.querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ const i=+b.dataset.i; if(b.dataset.a==='del'){ t.questions.splice(i,1); t.questions.forEach((q,j)=>q.n=j+1);} else { t.questions[i].confirmed=true; Store.logAudit(t,'q_confirm','Q'+t.questions[i].n);} Store.save(db); render(); }; });
  }
  render();
  $('#addQ').onclick=()=>{ t.questions.push({n:t.questions.length+1,text:'',options:['','','',''],confirmed:false,ai:false}); Store.save(db); render(); };
  $('#done').onclick=()=>{ t.questions.forEach(q=>{ if(q.text.trim()) q.confirmed=true; }); Store.save(db); toast('Confirmed'); route(); };
}
// ---------- ANSWER KEY ----------
function uiKey(v,id){ const t=Store.getTest(db,id); if(!t) return;
  v.innerHTML=hdr('Answer key','Method A — tap the correct answer. AI never sets this for you.')
  +'<div class="card"><div class="keygrid" id="kg"></div><p class="muted small">Method B (paper): print the answer-key OMR below, fill it on paper, then scan it like a student sheet.</p><div class="btn-row"><button class="btn btn-ghost" id="pk">Print answer-key OMR</button></div></div>'
  +'<div class="btn-row"><a class="btn btn-primary" href="#/omr/'+t.id+'">Continue — Generate OMR</a></div>';
  const kg=$('#kg');
  function render(){ kg.innerHTML=t.questions.map(q=>'<div><div class="small muted">Q'+q.n+'</div>'+['A','B','C','D'].map(o=>'<button data-q="'+q.n+'" data-o="'+o+'" class="'+(t.answerKey[q.n]===o?'sel':'')+'">'+o+'</button>').join('')+'</div>').join('');
    kg.querySelectorAll('button').forEach(b=>b.onclick=()=>{ t.answerKey[b.dataset.q]=b.dataset.o; t.answerSource[b.dataset.q]='teacher-digital'; Store.logAudit(t,'key_set','Q'+b.dataset.q+'='+b.dataset.o); Store.save(db); render(); });
  }
  render();
  $('#pk').onclick=()=>{ const r=document.getElementById('printRoot'); r.innerHTML=answerKeyOMRHTML(t); window.print(); };
}
// ---------- OMR ----------
function uiOMR(v,id){ const t=Store.getTest(db,id); if(!t) return;
  const ready=t.questions.filter(q=>q.confirmed).length, keyed=Object.keys(t.answerKey).length;
  v.innerHTML=hdr('Generate OMR','Clean printable sheet with detection markers.')
  +(ready<t.questions.length?'<div class="card"><span class="pill warn">Needs Review</span> '+ready+'/'+t.questions.length+' questions confirmed. Unconfirmed rows still print but verify first.</div>':'<div class="card"><span class="pill ok">Ready</span> All questions confirmed.</div>')
  +(keyed<t.questions.length?'<div class="card"><span class="pill warn">Answer key incomplete</span> '+keyed+'/'+t.questions.length+' set. You can still print student sheets.</div>':'')
  +'<div class="card"><div class="btn-row"><button class="btn btn-primary" id="pr">Print / Download PDF</button><a class="btn btn-teal" href="#/scan/'+t.id+'">Scan Answers</a></div><p class="muted small">Tip: print at 100% scale, A4. Keep markers unfaded for reliable scanning.</p></div><div id="prev"></div>';
  import('./omr.js').then(m=>{ $('#prev').innerHTML=m.omrHTML(t); });
  $('#pr').onclick=()=>printOMR(t);
}
// ---------- SCAN ----------
function uiScan(v,id){ const t=Store.getTest(db,id); if(!t) return;
  v.innerHTML=hdr('Scan Answers','1 flat sheet → 2 full visible → 3 steady → 4 capture → 5 review → 6 confirm.')
  +'<div class="card"><label class="fl">Student name</label><input id="sn" placeholder="e.g. Aarav Sharma"/><div class="grid2"><div><label class="fl">Roll</label><input id="sr" placeholder="e.g. 12"/></div><div><label class="fl">Section</label><input id="ss" placeholder="A"/></div></div></div>'
  +'<div class="card"><video id="vd" class="video" playsinline muted></video><p id="hint" class="muted small">Allow camera, or upload below.</p><div class="btn-row"><button class="btn btn-primary" id="cam">Start camera</button><button class="btn btn-ghost" id="cap" disabled>Capture</button></div>'
  +'<label class="fl">Or upload photo</label><input id="up" type="file" accept="image/*" capture="environment"/><canvas id="cv" class="scan" width="960" height="1280"></canvas><div id="q"></div></div>'
  +'<div class="btn-row"><button class="btn btn-primary" id="sv" disabled>Review → Save result</button></div>';
  let stream=null, analysis=null;
  const vd=$('#vd'), cv=$('#cv'), ctx=cv.getContext('2d');
  $('#cam').onclick=async()=>{ try{ stream=await startCamera(vd); $('#cap').disabled=false; $('#hint').textContent='Place sheet flat, fit all 4 markers, hold steady, then Capture.'; }catch(e){ $('#hint').textContent='Camera blocked: '+e.message+'. Please upload a photo instead.'; } };
  async function handleImage(img){ drawCover(cv,img); const qh=qualityHints(cv); analysis=analyze(cv,t.questions.length);
    $('#hint').innerHTML=(qh.sheetLikely?'<span class="pill ok">OMR detected</span>':'<span class="pill warn">Entire sheet not visible</span>')+(qh.hints.length?'<br>'+qh.hints.map(esc).join('<br>'):'');
    renderReview(); $('#sv').disabled=false; }
  $('#cap').onclick=()=>{ ctx.drawImage(vd,0,0,cv.width,cv.height); const im=new Image(); im.onload=()=>handleImage(im); im.src=cv.toDataURL(); };
  $('#up').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; handleImage(await fileToImage(f)); };
  function renderReview(){ const q=$('#q'); q.innerHTML='<h3>Confirm detected answers</h3>'+analysis.map((a,i)=>'<div class="qcard"><div class="qhead"><strong>Q'+a.q+'</strong>'+(a.blank?'<span class="pill">Blank</span>':a.needsReview||a.multi?'<span class="pill warn">Needs Review</span>':'<span class="pill ok">Detected '+a.detected+' ('+Math.round(a.conf*100)+'%)</span>')+'</div><div class="bubbles">'+['A','B','C','D'].map(L=>'<button data-i="'+i+'" data-l="'+L+'" class="'+(a.detected===L?'on':'')+((a.needsReview||a.multi)&&a.detected===L?' low':'')+'">'+L+'</button>').join('')+'<button data-i="'+i+'" data-l="">Blank</button></div>'+(a.multi?'<p class="small" style="color:var(--amber)">Multiple marks suspected — please verify on paper.</p>':'')+'</div>').join('');
    q.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const a=analysis[+b.dataset.i]; a.detected=b.dataset.l||null; a.blank=!b.dataset.l; a.needsReview=false; a.multi=false; renderReview(); });
  }
  $('#sv').onclick=()=>{ const nm=$('#sn').value.trim()||'Unnamed', rl=$('#sr').value.trim()||'-';
    const ans={}; analysis.forEach(a=>ans[a.q]=a.detected);
    const res=mark(t,ans);
    t.submissions=t.submissions.filter(s=>!(s.student.roll===rl&&s.student.name===nm));
    t.submissions.push({id:'s'+Date.now(),student:{name:nm,roll:rl,sec:$('#ss').value.trim()},answers:ans,review:analysis,result:res,at:new Date().toISOString()});
    Store.logAudit(t,'scan_save',nm+' '+rl+' = '+res.score); Store.save(db); stopStream(stream); toast('Saved: '+res.score+'/'+res.max); go('#/result/'+t.id); };
}
// ---------- RESULTS ----------
function uiResult(v,id){ const t=Store.getTest(db,id); if(!t) return;
  v.innerHTML=hdr(t.name+' — Results','Transparent scoring. Tap a column to sort.')
  +'<div class="kpi"><div class="card"><strong>'+t.submissions.length+'</strong><div class="muted small">Evaluated</div></div><div class="card"><strong>'+(t.submissions.length? Math.round(t.submissions.reduce((s,x)=>s+x.result.pct,0)/t.submissions.length*10)/10 : 0)+'%</strong><div class="muted small">Avg</div></div></div>'
  +'<div class="card"><div class="btn-row"><button class="btn btn-ghost" id="csv">Export CSV</button><button class="btn btn-ghost" id="xls">Export Excel</button><button class="btn btn-ghost" id="pdf">Print PDF</button></div></div>'
  +'<div class="card" style="overflow:auto"><table class="tbl" id="tbl"><thead><tr><th data-k="student.name">Name</th><th data-k="student.roll">Roll</th><th data-k="result.score">Score</th><th data-k="result.pct">%</th><th data-k="result.correct">✓</th><th data-k="result.wrong">✗</th><th data-k="result.blank">–</th></tr></thead><tbody></tbody></table></div>'
  +'<div class="btn-row"><a class="btn btn-teal" href="#/scan/'+t.id+'">+ Scan more</a></div>';
  let key='result.score', dir=-1;
  function val(o,p){ return p.split('.').reduce((a,k)=>a?a[k]:'',o); }
  function render(){ const rows=[...t.submissions].sort((a,b)=>{ const x=val(a,key),y=val(b,key); return (x>y?1:x<y?-1:0)*dir; });
    document.querySelector('#tbl tbody').innerHTML=rows.map(s=>'<tr><td>'+esc(s.student.name)+'<div class="muted small">Correct '+s.result.correct+' · Wrong '+s.result.wrong+' · Blank '+s.result.blank+'</div></td><td>'+esc(s.student.roll)+'</td><td><b>'+s.result.score+'/'+s.result.max+'</b></td><td>'+s.result.pct+'%</td><td>'+s.result.correct+'</td><td>'+s.result.wrong+'</td><td>'+s.result.blank+'</td></tr>').join('')||'<tr><td colspan=7 class="muted">No scans yet.</td></tr>'; }
  document.querySelectorAll('#tbl th').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; dir=(key===k?-dir:1); key=k; render(); });
  render();
  $('#csv').onclick=()=>exportCSV(t); $('#xls').onclick=()=>exportXLSX(t); $('#pdf').onclick=()=>printResults(t);
}
function uiTests(v){ v.innerHTML=hdr('My Tests','Open a test to see questions, key, sheets, results.')+'<div class="list">'+(db.tests.map(testCard).join('')||'<div class="card muted">No tests yet.</div>')+'</div><div class="btn-row"><a class="btn btn-primary" href="#/create">+ Create Test</a></div>'; }
function uiResultsAll(v){ if(!db.tests.length){ v.innerHTML=hdr('Results','No tests yet.'); return; }
  v.innerHTML=hdr('Results','All tests.')+'<div class="list">'+db.tests.map(t=>'<a class="row-card" href="#/result/'+t.id+'"><div><strong>'+esc(t.name)+'</strong><span class="muted small">'+t.submissions.length+' students</span></div><span>›</span></a>').join('')+'</div>'; }
function uiSettings(v){ v.innerHTML=hdr('Settings','Teacher profile (stored on device).')
  +'<div class="card"><label class="fl">Teacher name</label><input id="tn" value="'+esc(db.teacher.name||'')+'"/><div class="btn-row"><button class="btn btn-primary" id="sv">Save</button><button class="btn btn-danger" id="wipe">Erase all local data</button></div></div>';
  $('#sv').onclick=()=>{ db.teacher.name=$('#tn').value.trim(); Store.save(db); toast('Saved'); };
  $('#wipe').onclick=()=>{ if(confirm('Erase all tests on this device?')){ db={teacher:{name:''},tests:[]}; Store.save(db); location.reload(); } };
}
