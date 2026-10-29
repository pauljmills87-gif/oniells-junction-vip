// Shared OneSignal + PWA service worker. Keep the push SDK import.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Chrome's install prompt can require a real fetch handler.
// Network-first navigation only; no caching of private VIP pages or APIs.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
