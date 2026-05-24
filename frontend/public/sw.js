self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const isCall = data.data && (data.data.type === "group_call_invite" || data.data.callType);
    
    if (isCall) {
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
    } else {
      // Standard Message Notification
      const options = {
        body: data.body,
        icon: data.data.senderPic || "/chatZone.png",
        badge: "/chatZone.png",
        data: data.data,
        vibrate: [200, 100, 200], // Short vibration
        tag: data.data.groupId ? `group-${data.data.groupId}` : `chat-${data.data.from}`,
        renotify: true,
        timestamp: Date.now(),
        silent: false,
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const data = event.notification.data;

  if (event.action === "decline") {
    // We could potentially send a 'decline' signal to the backend here
    return;
  }

  // Determine the target URL based on notification type
  let targetUrl = "/";
  if (data.type === "group_call_invite" || data.callType) {
    targetUrl = "/?call=true&from=" + data.from + "&type=" + data.callType;
  } else if (data.type === "new_group_message" && data.groupId) {
    targetUrl = "/?groupId=" + data.groupId;
  } else if (data.type === "new_message" && data.chatId) {
    targetUrl = "/?chatId=" + data.chatId;
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
            // Navigate if it's not the exact url or if it's a call
            if (client.url.indexOf(targetUrl) === -1 || targetUrl.includes("call=true")) {
                return client.navigate(targetUrl);
            }
            return;
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
