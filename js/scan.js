// Scan: camera + upload + canvas heuristic. Never auto-accept low confidence.
export async function startCamera(video){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Camera not supported in this browser. Please upload a photo instead.');
  const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  video.srcObject=s; await video.play(); return s;
}
export function stopStream(s){ try{ s && s.getTracks().forEach(t=>t.stop()); }catch{} }
export function fileToImage(file){ return new Promise((res,rej)=>{ const u=URL.createObjectURL(file); const im=new Image(); im.onload=()=>{URL.revokeObjectURL(u);res(im)}; im.onerror=rej; im.src=u; }); }
export function drawCover(canvas, img){ const ctx=canvas.getContext('2d'); const W=canvas.width=960; const H=canvas.height=Math.round(960*(img.height/img.width)); ctx.drawImage(img,0,0,W,H); return ctx; }
export function qualityHints(canvas){
  const ctx=canvas.getContext('2d'); const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let sum=0,n=0; for(let i=0;i<d.length;i+=40){ sum+=(d[i]+d[i+1]+d[i+2])/3; n++; }
  const mean=sum/n; const hints=[];
  if(mean<60) hints.push('Image too dark — add light, avoid shadows.');
  if(mean>215) hints.push('Image overexposed — reduce glare.');
  // corner darkness check as sheet-visible proxy
  const corner=(x,y)=>{ const p=(y*canvas.width+x)*4; return (d[p]+d[p+1]+d[p+2])/3; };
  const cs=[corner(30,30),corner(canvas.width-30,30),corner(30,canvas.height-30),corner(canvas.width-30,canvas.height-30)];
  const dark=cs.filter(v=>v<120).length;
  if(dark<2) hints.push('Entire sheet not visible — move back, keep all 4 corner markers inside frame.');
  return {mean, hints, sheetLikely:dark>=2};
}
// Heuristic: assume sheet fills frame; rows = totalQ split in 2 columns like print layout.
export function analyze(canvas, totalQ){
  const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height;
  const img=ctx.getImageData(0,0,W,H);
  function darkness(x0,y0,x1,y1){ let s=0,c=0; for(let y=Math.floor(y0);y<y1;y+=4){ for(let x=Math.floor(x0);x<x1;x+=4){ const p=(y*W+x)*4; s+=255-(img.data[p]+img.data[p+1]+img.data[p+2])/3; c++; } } return c?s/c:0; }
  const top=H*0.24, bot=H*0.93, left=W*0.06, right=W*0.94;
  const perCol=Math.ceil(totalQ/2); const out=[];
  for(let q=0;q<totalQ;q++){
    const col=q<perCol?0:1; const r=col? q-perCol : q;
    const rows=perCol; const rh=(bot-top)/rows; const y0=top+r*rh+rh*0.15, y1=top+(r+1)*rh-rh*0.12;
    const cw=(right-left)/2; const x0=left+col*cw+cw*0.18, x1=left+(col+1)*cw-cw*0.04;
    const cellW=(x1-x0)/4; const vals=[0,1,2,3].map(i=>darkness(x0+i*cellW,y0,x0+(i+1)*cellW,y1));
    const sorted=[...vals].sort((a,b)=>b-a); const best=vals.indexOf(sorted[0]);
    const margin=sorted[0]-sorted[1]; const abs=sorted[0];
    let detected=null, blank=false, multi=false, conf=0;
    if(abs<14){ blank=true; conf=0.9; }
    else { detected='ABCD'[best]; conf=Math.min(0.99, margin/28); if(sorted[1]>22 && margin<10) multi=true; }
    const needsReview = blank? false : (multi || conf<0.62 || abs<16);
    out.push({q:q+1, detected:blank?null:detected, blank, multi, conf:Math.round(conf*100)/100, needsReview, cells:vals.map(v=>Math.round(v))});
  }
  return out;
}
