/* coi-serviceworker v0.1.7 - github.com/gzuidhof/coi-serviceworker */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function rewriteResponse(request, response) {
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
    const { request } = event;
    event.respondWith(
        fetch(request)
            .then((response) => rewriteResponse(request, response))
            .catch(() => fetch(request))
    );
});
