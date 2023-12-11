import { entries, del } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

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
    "https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2",
    "icons/ios/144.png",
    "icons/windows11/Wide310x150Logo.scale-400.png",
    "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm",
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

async function NetworkRequest(request) {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 404) return await caches.match("404.html");
    return networkResponse;
}

async function StaleWhileRevalidate(request) {
    // Vrati cache ako postoji inače napravi request 
    // te neovisno o tome je li poslan cache napravi request i osvježi (revalidate) cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        // console.log("Pogođen cache: ", request.url);
        // Revalidate cache
        try {
            const networkResponse = await NetworkRequest(request);
            const cache = await caches.open(cacheName);
            await cache.put(request.url, networkResponse.clone());
        } catch (err) {
            // U slučaju da revalidate request nije prošao ne možemo osvježit cache
        }
        return cachedResponse;
    } else {
        // Ne postoji cache napravi request i cachaj
        try {
            const networkResponse = await NetworkRequest(request);
            const cache = await caches.open(cacheName);
            await cache.put(request.url, networkResponse.clone());
            return networkResponse;
        } catch (err) {
            console.error(err);
            console.log(request.url);
            // Ako request ne prolazi vrati offline.html
            return await caches.match('offline.html');
        }
    }
}

async function NetworkFirst(request) {
    // Uvjek napravi request i to vrati te cachiraj, a ako ne možemo dobiti network requesta vrati cache ako postoji
    try {
        const networkResponse = await NetworkRequest(request);
        // Ako je network request uspio cachiraj
        const cache = await caches.open(cacheName);
        await cache.put(request.url, networkResponse.clone());
        // Vrati network request jer je Network First
        return networkResponse;
    } catch (err) {
        // Ako network request nije uspio vrati cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        // Ako nemamo ni cache a network ne radi vrati da smo offline
        return await caches.match('offline.html');
    }
}

async function SyncSaveAudio() {
    // Upload na server api
    entries().then((entries) => {
        for (const entry of entries) {
            const key = entry[0];
            const value = entry[1];
            const formData = new FormData();
            formData.append('id', key);
            formData.append('naziv', value.naziv);
            formData.append('audioBlob', value.audioBlob);
            fetch("/api/audio", {
                method: "POST",
                body: formData
            }).then(res => {
                if (res.ok) {
                    del(key);
                    console.log('Obrisan: ', key);
                }
            })
                .catch(err => console.error(err));
        }
    });
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
    // za zahtjev kad tražim audiozapise želim uvjek prvo najnovije, pa za taj zahtjev radim Network First
    if (e.request.url.endsWith('/api/audio')) {
        console.log("Network First: ", e.request.url);
        e.respondWith(NetworkFirst(e.request));
    }
    // Za ostale zahtjeve koji mi nisu toliko bitni radim StaleWhileRevalidate
    else e.respondWith(StaleWhileRevalidate(e.request));
});

self.addEventListener("sync", function (event) {
    console.log("Background sync", event);
    if (event.tag === "sync-save-audio") {
        event.waitUntil(SyncSaveAudio());
    }
});
