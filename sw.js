// Service Worker - 虚拟化学实验室 PWA v2
const CACHE_VERSION = 'chem-lab-v2-20260724';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon-192.png',
  './icon-512.png'
];

// 安装时立即缓存并强制激活
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return Promise.all(
        ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  // 立即激活，不等旧 SW 释放
  self.skipWaiting();
});

// 激活时删除所有旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => {
          return caches.delete(k);
        })
      );
    }).then(() => {
      // 立即接管所有客户端
      return self.clients.claim();
    })
  );
});

// 网络优先策略：每次都先尝试网络，拿到新版就更新缓存
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // 只处理同源请求
  if(url.origin !== self.location.origin) return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// 接收到消息时强制清理缓存并通知客户端刷新
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING'){
    self.skipWaiting();
  }
  if(event.data === 'CLEAR_CACHE'){
    caches.keys().then(keys => {
      return Promise.all(keys.map(k => caches.delete(k)));
    }).then(() => {
      event.ports[0].postMessage('CACHE_CLEARED');
    });
  }
});
