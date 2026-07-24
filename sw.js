// Service Worker - 虚拟化学实验室 PWA
const CACHE_NAME = 'chem-lab-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装时缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('Cache partial fail:', err);
        // 即使部分缓存失败也继续
        return Promise.all(
          ASSETS.map(url => cache.add(url).catch(() => {}))
        );
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 网络优先，失败回退缓存
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if(event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功获取，更新缓存
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，用缓存
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./index.html');
        });
      })
  );
});
