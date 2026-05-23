import crypto from "crypto";

// For production Coturn setups using the REST API (HMAC)
export const getTurnCredentials = (username) => {
  const turnSecret = process.env.COTURN_SECRET;
  const turnUrl = process.env.COTURN_URL || "turn:your-coturn-ip:3478";

  if (!turnSecret) {
    console.warn("WARNING: COTURN_SECRET not found in environment. Returning fallback public STUN servers.");
    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
  }

  // Generate time-limited credential (valid for 1 hour)
  const unixTimeStamp = Math.floor(Date.now() / 1000) + 3600;
  const turnUsername = `${unixTimeStamp}:${username}`;

  const hmac = crypto.createHmac("sha1", turnSecret);
  hmac.setEncoding("base64");
  hmac.write(turnUsername);
  hmac.end();
  const turnPassword = hmac.read();

  return {
    iceServers: [
      {
        urls: turnUrl,
        username: turnUsername,
        credential: turnPassword,
      },
      // Fallback STUN
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };
};
