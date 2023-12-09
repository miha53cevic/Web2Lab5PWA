const cacheName = "diktafon-v1";
const resourcesToCache = [
    '/',
    'index.html',
    '404.html',
    'index.css',
    'logo.png',
    'manifest.json',
];

self.addEventListener('install', e => {
    console.log("Instalacija service workera...");
    e.waitUntil(async () => {
        try {
            const cache = await caches.open(cacheName);
            await cache.addAll(resourcesToCache);
        } catch(err) {
            console.log("Greška kod instaliranja service workera!");
        }
    });
});

self.addEventListener('activate', e => {
    console.log("Aktivacija service workera");
});

self.addEventListener("fetch", e => {
    e.respondWith(
        caches
            .match(e.request)
            .then((response) => {
                if (response) {
                    // console.log("Found " + event.request.url + " in cache!");
                    //return response;
                }
                // console.log("----------------->> Network request for ",
                //     event.request.url
                // );
                return fetch(e.request).then((response) => {
                    // console.log("response.status = " + response.status);
                    if (response.status === 404) {
                        return caches.match("404.html");
                    }
                    return caches.open(staticCacheName).then((cache) => {
                        // console.log(">>> Caching: " + event.request.url);
                        cache.put(e.request.url, response.clone());
                        return response;
                    });
                });
            })
            .catch((error) => {
                console.log("Error", e.request.url, error);
                // ovdje možemo pregledati header od zahtjeva i možda vratiti različite fallback sadržaje
                // za različite zahtjeve - npr. ako je zahtjev za slikom možemo vratiti fallback sliku iz cachea
                // ali zasad, za sve vraćamo samo offline.html:
                return caches.match("offline.html");
            })
    );
});
