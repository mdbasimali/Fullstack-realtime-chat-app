self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.data.senderPic || "/chatZone.png",
      badge: "/chatZone.png",
      data: data.data,
      actions: [
        { action: "answer", title: "✅ Answer" },
        { action: "decline", title: "❌ Decline" }
      ],
      vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500], // Aggressive vibration
      tag: "incoming-call",
      renotify: true,
      requireInteraction: true,
      timestamp: Date.now(),
      image: data.data.senderPic || "/chatZone.png",
      silent: false,
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
        // If a window is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if ("focus" in client) {
            client.focus();
            // Only navigate if we're not already on a page that can handle the call
            if (!client.url.includes("call=true")) {
                return client.navigate("/?call=true&from=" + data.from + "&type=" + data.callType);
            }
            return;
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow("/?call=true&from=" + data.from + "&type=" + data.callType);
        }
      })
  );
});
