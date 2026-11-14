// PWA Service Worker：只缓存静态资源与离线页，绝不缓存页面 HTML / RSC 数据，避免私人日记残留
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `page-${VERSION}`;
const OFFLINE_URL = "/offline";
const NAV_TIMEOUT = 5000;

const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/_next/image"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheable(url) {
  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT)),
    ]);
    return response;
  } catch {
    const cached = await cache.match(OFFLINE_URL);
    if (cached) return cached;
    return new Response("当前网络不可用，请稍后重试", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 认证、Supabase 代理、Sentry 转发、RSC 数据一律直连
  if (
    url.pathname.startsWith("/sb") ||
    url.pathname.startsWith("/monitoring") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth") ||
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1"
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isCacheable(url)) {
    event.respondWith(cacheFirst(request));
  }
});
