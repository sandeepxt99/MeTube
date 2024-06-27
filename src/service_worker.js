// Cached core static resources 
self.addEventListener("install", e => {
    e.waitUntil(
        caches.open("static").then(cache => {
            return cache.addAll([
                "./",
                "./index.html",
                './style.css',
                "./script.js",
                "./utils.script.js",
                './assest/youtube_logo.png',
                "./assest/page-not-found.png"
            ]);
        })
    );
});

// Fatch resources
self.addEventListener("fetch", e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});