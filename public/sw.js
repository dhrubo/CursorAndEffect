self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL("/home", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const current = clients[0];
      if (current && "focus" in current) {
        const focused = current.focus();
        if ("navigate" in current) return focused.then(() => current.navigate(destination));
        return focused;
      }
      return self.clients.openWindow(destination);
    }),
  );
});
