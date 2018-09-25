// configuration
`use strict`;


/**
 * serverWork 配置详情
 * */

const
  version = '1.0.0',
  CACHE = version + '::PWAsite',
  offlineURL = '/offline/',   // 当离线时用户试图访问之前未缓存的页面时，这个页面会呈现给用户。

   /**
    *  installFilesEssential: 1.离线功能的页面必要文件的数组
    *                         2. 应该包含静态文件 css\js\img
    *                         3. 要把文件主页（/）和图标文件写进去
    *                         4.如果有多个主页文件入口都要加上 如 '/'和 '/index'
    *                         5. offlineURL 也要被写进去
    *
    *
    * */

  installFilesEssential = [
    '/',
    '/manifest.json',
    '/css/styles.css',
    '/js/main.js',
    '/js/offlinepage.js',
    '/images/logo/logo152.png'
  ].concat(offlineURL),

  /**
   *  installFilesDesirable: 可选的 描述文件数组，这写文件都会被下载
   */

  installFilesDesirable = [
    '/favicon.ico',
    '/images/logo/logo016.png',
    '/images/hero/power-pv.jpg',
    '/images/hero/power-lo.jpg',
    '/images/hero/power-hi.jpg'
  ];

 /**
  * installStaticFiles 添加文件到缓存。该函数当有返回值时，表明所有的必要文件都被缓存成功
  *
  * */

function installStaticFiles() {

  return caches.open(CACHE)
    .then(cache => {

      // cache desirable files
      cache.addAll(installFilesDesirable);

      // cache essential files
      return cache.addAll(installFilesEssential);

    });

}



// clear old caches
function clearOldCaches() {

  return caches.keys()
    .then(keylist => {

      return Promise.all(
        keylist
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      );

    });

}



// application installation
self.addEventListener('install', event => {

  console.log('service worker: install');

  // cache core files
  event.waitUntil(
    installStaticFiles()
    .then(() => self.skipWaiting())
  );

});


// application activated
self.addEventListener('activate', event => {

  console.log('service worker: activate');

	// delete old caches
  event.waitUntil(
    clearOldCaches()
    .then(() => self.clients.claim())
	);

});


// is image URL?
let iExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].map(f => '.' + f);
function isImage(url) {

  return iExt.reduce((ret, ext) => ret || url.endsWith(ext), false);

}


// return offline asset
function offlineAsset(url) {

  if (isImage(url)) {

    // return image
    return new Response(
      '<svg role="img" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title>offline</title><path d="M0 0h400v300H0z" fill="#eee" /><text x="200" y="150" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="50" fill="#ccc">offline</text></svg>',
      { headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store'
      }}
    );

  }
  else {

    // return page
    return caches.match(offlineURL);

  }

}


// application fetch network data
self.addEventListener('fetch', event => {

  // abandon non-GET requests
  if (event.request.method !== 'GET') return;

  let url = event.request.url;

  event.respondWith(

    caches.open(CACHE)
      .then(cache => {

        return cache.match(event.request)
          .then(response => {

            if (response) {
              // return cached file
              console.log('cache fetch: ' + url);
              return response;
            }

            // make network request
            return fetch(event.request)
              .then(newreq => {

                console.log('network fetch: ' + url);
                if (newreq.ok) cache.put(event.request, newreq.clone());
                return newreq;

              })
              // app is offline
              .catch(() => offlineAsset(url));

          });

      })

  );

});
