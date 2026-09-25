// Deterministic transparent marking.
export function mark(test, answers){
  // answers: {1:'A'|null, ...} null = blank
  let correct=0, wrong=0, blank=0;
  const rows=test.questions.map(q=>{
    const key=test.answerKey[q.n]; const got=(answers[q.n]==null?'':answers[q.n]);
    let res='blank', pts=0;
    if(!got){ blank++; res='blank'; }
    else if(got===key){ correct++; pts=test.marksPerQ; res='correct'; }
    else { wrong++; pts=-(test.negMark||0); res='wrong'; }
    return {q:q.n, key:key||'', got:got||'', res, pts};
  });
  const max=test.questions.length*test.marksPerQ;
  const score=rows.reduce((s,r)=>s+r.pts,0);
  const pct=max? Math.round(score/max*1000)/10 : 0;
  return {correct, wrong, blank, total:test.questions.length, max, score:Math.round(score*100)/100, pct, rows};
}
