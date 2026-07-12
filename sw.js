// 微光小鎮 Glimmerville — 離線快取 Service Worker（T27）
// 版本升級策略：日後改版時，把下面 CACHE 常數的版號升一號（例如 'gv-v2'），
// 舊快取會在 activate 階段自動被清除，不需要手動處理。
const CACHE='gv-v1';
const FILES=['./index.html','./manifest.json','./icon.svg','./sw.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request))
  );
});
