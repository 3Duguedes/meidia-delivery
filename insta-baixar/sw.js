// Service Worker mínimo — só o necessário pra o navegador considerar o site
// instalável como PWA. Faz cache do "shell" da página (HTML/CSS/JS inline)
// para abrir mais rápido e funcionar offline; NUNCA cacheia chamadas às
// functions (/.netlify/functions/... e /download), que sempre precisam
// de rede pra buscar mídia atualizada do Instagram.

const CACHE_NAME = "baixainsta-glink-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca intercepta chamadas de API/download — sempre precisa ser fresco.
  if (url.pathname.startsWith("/.netlify/") || url.pathname.startsWith("/download")) {
    return;
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
