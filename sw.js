// 微光小鎮 Glimmerville — 離線快取 Service Worker（T27 / T268）
const CACHE_PREFIX='glimmerville-shell-';
/* T349 版本單一來源：快取名由 APP_VER 組出，APP_VER 必須與 index.html 的 GAME_VER 相同
   （tools/bump.py 一次改兩處；test_fixde.js 有一條斷言比對兩檔相等，漂移立刻紅）。
   歷史事故：兩處各自手動維護曾造成 sw v36 / 測試釘 v28 不同步，讓外部審閱者誤判「測試紅、專案沒提交」。 */
const APP_VER='11.146';
const CACHE=CACHE_PREFIX+'v'+APP_VER;
const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);
const FILES=[
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-v1-192.png',
  './icon-v1-512.png',
  './icon-v1-maskable-512.png'
];
const INDEX_URL=new URL('./index.html',self.location.href).href;
const MANIFEST_URL=new URL('./manifest.json',self.location.href).href;
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
        try{
          const cache=await caches.open(CACHE);
          const offline=await cache.match(INDEX_URL);
          if(offline)return offline;
        }catch(_){/* Cache Storage 不可讀時仍回明確導航 503，而非裸 rejection */}
        return new Response('離線且尚未完成首次快取。',{
          status:503,
          headers:{'Content-Type':'text/plain;charset=utf-8'}
        });
      }
    })());
    return;
  }

  if(url.pathname===new URL(MANIFEST_URL).pathname){
    e.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok){
          try{
            const cache=await caches.open(CACHE);
            await cache.put(MANIFEST_URL,fresh.clone());
          }catch(_){/* 寫入失敗不應吞掉已成功的 manifest 網路回應 */}
        }
        return fresh;
      }catch(err){
        try{
          const cache=await caches.open(CACHE);
          const offline=await cache.match(MANIFEST_URL);
          if(offline)return offline;
        }catch(_){/* Cache Storage 無法讀取時仍應回明確 503，而非裸 rejection */}
        return new Response('{"error":"offline-manifest-not-cached"}',{
          status:503,
          headers:{'Content-Type':'application/manifest+json;charset=utf-8'}
        });
      }
    })());
    return;
  }

  if(!SHELL_PATHS.has(url.pathname))return;
  e.respondWith(
    (async()=>{
      try{
        const cache=await caches.open(CACHE);
        const hit=await cache.match(url.href,{ignoreSearch:true});
        if(hit)return hit;
      }catch(_){/* 快取讀取故障時降級至網路，不能攔死仍可用的 app-shell response */}
      return fetch(req);
    })()
  );
});
