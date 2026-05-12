self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.data.senderPic || "/chatZone.png",
      badge: "/chatZone.png",
      data: data.data,
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      tag: "incoming-call", // Prevent multiple notifications for the same call
      requireInteraction: true, // Keep notification until user interacts
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const data = event.notification.data;

  if (event.action === "decline") {
    // We could potentially send a 'decline' signal to the backend here
    return;
  }

  // Answer or general click: open the app
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // If a window is already open, focus it and navigate
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url.includes("/") && "focus" in client) {
            client.focus();
            return client.navigate("/?call=true&from=" + data.from + "&type=" + data.callType);
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow("/?call=true&from=" + data.from + "&type=" + data.callType);
        }
      })
  );
});
