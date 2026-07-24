// 微光小鎮 Glimmerville — 離線快取 Service Worker（T27 / T268）
const CACHE_PREFIX='glimmerville-shell-';
const CACHE=CACHE_PREFIX+'v3';
const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);
const FILES=['./index.html','./manifest.json','./icon.svg'];
const INDEX_URL=new URL('./index.html',self.location.href).href;
const SCOPE_URL=new URL(self.registration.scope);
const ENTRY_PATHS=new Set([SCOPE_URL.pathname,new URL(INDEX_URL).pathname]);
const SHELL_PATHS=new Set(FILES.map(src=>new URL(src,self.location.href).pathname));

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(FILES))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==CACHE&&(k.startsWith(CACHE_PREFIX)||LEGACY_CACHES.has(k))).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(!url.href.startsWith(SCOPE_URL.href))return;

  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok&&ENTRY_PATHS.has(url.pathname)){
          try{
            const cache=await caches.open(CACHE);
            await cache.put(INDEX_URL,fresh.clone());
          }catch(_){/* 快取額度／寫入失敗不應吞掉已成功的網路導航 */}
        }
        return fresh;
      }catch(err){
        const cache=await caches.open(CACHE);
        const offline=await cache.match(INDEX_URL);
        if(offline)return offline;
        return new Response('離線且尚未完成首次快取。',{
          status:503,
          headers:{'Content-Type':'text/plain;charset=utf-8'}
        });
      }
    })());
    return;
  }

  if(!SHELL_PATHS.has(url.pathname))return;
  e.respondWith(
    caches.open(CACHE).then(cache=>cache.match(url.href,{ignoreSearch:true})).then(hit=>hit||fetch(req))
  );
});
