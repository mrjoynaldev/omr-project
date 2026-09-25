const C='omr-v1'; const CORE=['./','./index.html','./styles.css','./js/app.js','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url); if(e.request.method!=='GET')return;
if(u.origin===location.origin){e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(cc=>cc.put(e.request,c));return r}).catch(()=>caches.match('./index.html'))))}})