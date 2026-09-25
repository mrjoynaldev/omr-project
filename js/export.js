// Export CSV / Excel / print-PDF. No server needed.
function dl(name, blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }
export function toCSV(rows){ const h=Object.keys(rows[0]||{name:'',roll:'',score:''}); const esc=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"'; return h.join(',')+'\n'+rows.map(r=>h.map(k=>esc(r[k])).join(',')).join('\n'); }
export function exportCSV(test){ const rows=test.submissions.map(s=>({name:s.student.name,roll:s.student.roll,klass:test.klass,score:s.result.score,max:s.result.max,pct:s.result.pct,correct:s.result.correct,wrong:s.result.wrong,blank:s.result.blank})); dl((test.name||'results')+'.csv', new Blob([toCSV(rows.length?rows:[{name:'',roll:'',score:''}])],{type:'text/csv'})); }
export async function exportXLSX(test){
  try{ if(!window.XLSX){ const s=document.createElement('script'); s.src='https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'; await new Promise((res,rej)=>{s.onload=res;s.onerror=rej;document.head.appendChild(s)}); } }catch{}
  if(!window.XLSX){ exportCSV(test); return; }
  const rows=test.submissions.map(s=>({Name:s.student.name,Roll:s.student.roll,Score:s.result.score,Max:s.result.max,Pct:s.result.pct,Correct:s.result.correct,Wrong:s.result.wrong,Blank:s.result.blank}));
  const ws=window.XLSX.utils.json_to_sheet(rows); const wb=window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb,ws,'Results'); window.XLSX.writeFile(wb,(test.name||'results')+'.xlsx');
}
export function printResults(test){ const w=window.open('','_blank'); const rows=test.submissions.map(s=>'<tr><td>'+s.student.name+'</td><td>'+s.student.roll+'</td><td>'+s.result.score+'/'+s.result.max+'</td><td>'+s.result.pct+'%</td></tr>').join(''); w.document.write('<h2>'+test.name+' — Results</h2><table border=1 cellpadding=6><tr><th>Name</th><th>Roll</th><th>Score</th><th>%</th></tr>'+rows+'</table><script>onload=()=>print()<\/script>'); w.document.close(); }
