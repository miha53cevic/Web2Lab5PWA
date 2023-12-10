const cacheName = "diktafon-v1";
const cachableResources = [
    "/",
    "index.html",
    "404.html",
    "index.css",
    "logo.png",
    "manifest.json",
    "offline.html",
    "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js",
    "https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js",
    "https://fonts.googleapis.com/icon?family=Material+Icons",
    "https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2"
];

async function Precache() {
    const cache = await caches.open(cacheName);
    await cache.addAll(cachableResources);
    console.log("Precache successful");
}

async function DeleteOldCaches() {
    const keys = await caches.keys();
    console.log("Current caches: ", keys);
    for (const key of keys) {
        if (key !== cacheName) {
            await caches.delete(key);
            console.log("Izbrisan cache: ", key);
        }
    }
}

async function StaleWhileRevalidate(request) {
    // Vrati cache ako postoji inače napravi request 
    // te neovisno o tome je li poslan cache napravi request i osvježi cache
    const response = await caches.match(request);
    if (response) return response;
    else {
        try {
            const requestResponse = await fetch(request);
            if (requestResponse.status === 404) return await caches.match("404.html");
            const cache = await caches.open(cacheName);
            await cache.put(request.url, requestResponse.clone());
            return requestResponse;
        } catch (err) {
            return await caches.match("offline.html");
        }
    }
}

self.addEventListener("install", e => {
    console.log("Instalacija service workera...");
    e.waitUntil(Precache());
});


self.addEventListener("activate", e => {
    console.log("Aktivacija service workera");
    e.waitUntil(DeleteOldCaches());
});

self.addEventListener("fetch", e => {
    e.respondWith(StaleWhileRevalidate(e.request));
});
