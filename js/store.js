// Store: offline-first teacher data. All private data stays on device (localStorage).
const KEY='omr_db_v1';
const uid=()=> 'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
function blank(){ return { teacher:{name:''}, tests:[] }; }
export function load(){ try{ const r=localStorage.getItem(KEY); if(!r) return blank(); const d=JSON.parse(r); if(!d.tests) return blank(); return d; }catch{ return blank(); } }
export function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
export function getTest(db,id){ return db.tests.find(t=>t.id===id); }
export function createTest(db,{name,subject,klass,section,totalQ,marksPerQ,negMark}){
  const t={ id:uid(), name:name||'Untitled test', subject:subject||'', klass:klass||'', section:section||'',
    totalQ:Math.max(1,parseInt(totalQ||20,10)), marksPerQ:parseFloat(marksPerQ||1), negMark:parseFloat(negMark||0),
    createdAt:new Date().toISOString(), status:'draft',
    questions:[], answerKey:{}, answerSource:{}, submissions:[], audit:[] };
  for(let i=1;i<=t.totalQ;i++) t.questions.push({n:i,text:'',options:['','','',''],confirmed:false,ai:false});
  t.audit.push({at:new Date().toISOString(),ev:'test_created'});
  db.tests.unshift(t); save(db); return t;
}
export function logAudit(t,ev,detail){ t.audit.push({at:new Date().toISOString(),ev,detail:detail||''}); }
