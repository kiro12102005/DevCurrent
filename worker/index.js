// Custom service worker extension, imported into the generated Workbox sw.js
// via next-pwa's customWorkerSrc mechanism (see next.config.ts). Runs in the
// same service worker scope, so `self` here is the ServiceWorkerGlobalScope.

self.addEventListener("push", (event) => {
  let payload = { title: "技術トレンド＆面接ネタ", body: "新着情報があります", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // non-JSON payload - fall back to the default text above
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
