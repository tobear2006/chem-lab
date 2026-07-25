// Service Worker - 虚拟化学实验室 PWA v3.2 - 强制更新版
const CACHE_VERSION = 'chem-lab-v3-20260725i';
const APP_VERSION = '3.0.8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './sw.js',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存 + 立即激活
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return Promise.all(
        ASSETS.map(url => cache.add(url + '?v=' + APP_VERSION).catch(() => {
          return cache.add(url).catch(() => {});
        }))
      );
    })
  );
  self.skipWaiting();
});

// 激活：清空所有旧版本缓存 + 接管客户端 + 通知刷新
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => caches.delete(k))
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({type: 'FORCE_RELOAD', version: APP_VERSION});
        });
      });
    })
  );
});

// 请求策略：
// - 导航请求（HTML页面）：总是从网络获取，确保最新版本
// - version.json：网络优先，不缓存
// - 其他静态资源：stale-while-revalidate
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  // 导航请求 - 强制网络获取
  if(event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/chem-lab/' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request, {cache: 'no-store', headers: {'Cache-Control': 'no-cache'}})
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
    return;
  }

  // version.json - 总是从网络获取
  if(url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他资源 - stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// 消息处理
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING'){
    self.skipWaiting();
  }
  if(event.data === 'CLEAR_CACHE'){
    caches.keys().then(keys => {
      return Promise.all(keys.map(k => caches.delete(k)));
    }).then(() => {
      return caches.open(CACHE_VERSION).then(cache => {
        return Promise.all(ASSETS.map(url => cache.add(url).catch(() => {})));
      });
    }).then(() => {
      event.ports[0] && event.ports[0].postMessage('CACHE_CLEARED');
    });
  }
});
