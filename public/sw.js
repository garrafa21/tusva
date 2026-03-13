self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "Tusva", body: "Você recebeu uma nova notificação." };

  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Tusva",
      body: event.data.text() || "Você recebeu uma nova notificação.",
    };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Tusva", {
      body: payload.body || "Você recebeu uma nova notificação.",
      icon: "/logo-tusva.jpg",
      badge: "/favicon.ico",
      data: payload.url || "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});