self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    let options = {};

    if (data.type === "message") {
      options = {
        body: data.body,
        icon: data.icon || "/chatZone.png",
        badge: "/chatZone.png",
        data: data.data,
        vibrate: [100, 50, 100],
        tag: "new-message",
        renotify: true,
        requireInteraction: false,
        timestamp: Date.now(),
      };
    } else {
      // Default to call notification
      options = {
        body: data.body,
        icon: data.data.senderPic || "/chatZone.png",
        badge: "/chatZone.png",
        data: data.data,
        actions: [
          { action: "answer", title: "✅ Answer" },
          { action: "decline", title: "❌ Decline" }
        ],
        vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500],
        tag: "incoming-call",
        renotify: true,
        requireInteraction: true,
        timestamp: Date.now(),
        image: data.data.senderPic || "/chatZone.png",
      };
    }

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const data = event.notification.data;
  
  const targetUrl = data.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if ("focus" in client) {
            client.focus();
            if (data.from && !client.url.includes("call=true")) {
                return client.navigate("/?call=true&from=" + data.from + "&type=" + data.callType);
            }
            return;
          }
        }
        if (clients.openWindow) {
          if (data.from) {
              return clients.openWindow("/?call=true&from=" + data.from + "&type=" + data.callType);
          }
          return clients.openWindow(targetUrl);
        }
      })
  );
});
