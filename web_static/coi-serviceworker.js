/* coi-serviceworker v0.1.7 - github.com/gzuidhof/coi-serviceworker */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.clients.claim().then(() => {
            // Reload all clients so they get the COEP/COOP headers from this SW
            self.clients.matchAll({ type: "window" }).then((clients) => {
                clients.forEach((client) => client.navigate(client.url));
            });
        })
    );
});

async function rewriteResponse(response) {
    if (response.status === 0 || !response.url) return response;
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}

self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => rewriteResponse(response))
            .catch(() => fetch(event.request))
    );
});
