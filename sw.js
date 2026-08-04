/* 新しい一問一答 service worker
   方針: HTML(ナビゲーション)=ネットワーク優先(毎日更新が最優先・オフライン時のみキャッシュ)
         静的資産(アイコン等)=キャッシュ優先
   バージョンを上げると旧キャッシュは activate 時に削除される */
const CACHE = "ichimon-v11";
const PRECACHE = [
  "./index.html",
  "./legal.html",
  "./atlas.html",
  "./links.html",
  "./contact.html",
  "./culture.html",
  "./features.html",
  "./features/feature-01.html",
  "./daily.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    // HTMLはネットワーク優先: 成功したらキャッシュ更新、失敗(オフライン)時はキャッシュ
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
    return;
  }

  // 静的資産はキャッシュ優先＋取得後に格納
  e.respondWith(
    caches.match(req).then((m) => {
      if (m) return m;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
