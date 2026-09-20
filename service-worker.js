const CACHE_NAME = "stock-pwa-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];


/* ==============================
   インストール
============================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_FILES);
      })
  );

  self.skipWaiting();

});


/* ==============================
   有効化
============================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches
      .keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))

        );

      })

  );

  self.clients.claim();

});


/* ==============================
   通信
============================== */

self.addEventListener("fetch", event => {

  const request = event.request;

  const url = new URL(request.url);


  /*
   Apps Scriptなど、
   GitHub Pages以外への通信はキャッシュしない
  */

  if (
    url.origin !== self.location.origin
  ) {
    return;
  }


  /*
   GET以外は処理しない
  */

  if (
    request.method !== "GET"
  ) {
    return;
  }


  /*
   HTML
   → ネット優先
  */

  if (
    request.mode === "navigate"
  ) {

    event.respondWith(

      fetch(request)
        .then(response => {

          const copy =
            response.clone();

          caches
            .open(CACHE_NAME)
            .then(cache => {

              cache.put(
                request,
                copy
              );

            });

          return response;

        })
        .catch(() => {

          return caches.match(
            "./index.html"
          );

        })

    );

    return;

  }


  /*
   CSS / JS / 画像など
   → キャッシュ優先
  */

  event.respondWith(

    caches
      .match(request)
      .then(cachedResponse => {

        if (cachedResponse) {

          /*
           裏で最新版も取得
          */

          fetch(request)
            .then(response => {

              if (
                response &&
                response.ok
              ) {

                caches
                  .open(CACHE_NAME)
                  .then(cache => {

                    cache.put(
                      request,
                      response
                    );

                  });

              }

            })
            .catch(() => {});


          return cachedResponse;

        }


        return fetch(request)
          .then(response => {

            if (
              !response ||
              !response.ok
            ) {

              return response;

            }


            const copy =
              response.clone();


            caches
              .open(CACHE_NAME)
              .then(cache => {

                cache.put(
                  request,
                  copy
                );

              });


            return response;

          });

      })

  );

});
