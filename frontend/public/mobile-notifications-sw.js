self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : {
        title: "MonPetitUber",
        body: "Nouvelle notification",
        url: "/",
      };

  event.waitUntil(
    self.registration.showNotification(data.title || "MonPetitUber", {
      body: data.body || "Nouvelle notification",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: {
        url: data.url || "/",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clients) => {
        const matchingClient = clients.find((client) => client.url === targetUrl);

        if (matchingClient) {
          return matchingClient.focus();
        }

        const appClient = clients.find((client) => {
          const clientUrl = new URL(client.url);
          return clientUrl.origin === self.location.origin;
        });

        if (appClient) {
          return appClient.navigate(targetUrl).then((client) => client?.focus());
        }

        return self.clients.openWindow(targetUrl);
      },
    ),
  );
});
