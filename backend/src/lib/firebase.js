import jwt from "jsonwebtoken";

let googlePublicKeysCache = null;
let googlePublicKeysExpiry = 0;

const fetchGooglePublicKeys = async () => {
  if (googlePublicKeysCache && Date.now() < googlePublicKeysExpiry) {
    return googlePublicKeysCache;
  }
  
  try {
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com");
    if (!res.ok) {
      throw new Error(`Failed to fetch public keys: ${res.statusText}`);
    }
    const data = await res.json();
    googlePublicKeysCache = data;
    // Cache for 6 hours
    googlePublicKeysExpiry = Date.now() + 6 * 60 * 60 * 1000;
    return googlePublicKeysCache;
  } catch (error) {
    console.error("Error fetching Google public keys:", error);
    throw error;
  }
};

export const verifyFirebaseToken = async (idToken, projectId) => {
  if (!idToken) {
    throw new Error("No ID Token provided");
  }
  if (!projectId) {
    throw new Error("Firebase Project ID not configured in environment");
  }

  try {
    const decodedHeader = jwt.decode(idToken, { complete: true });
    if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
      throw new Error("Invalid token format or header");
    }

    const kid = decodedHeader.header.kid;
    const publicKeys = await fetchGooglePublicKeys();
    const certificate = publicKeys[kid];
    if (!certificate) {
      throw new Error("Certificate not found for the given key ID");
    }

    const payload = jwt.verify(idToken, certificate, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    return payload;
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);
    throw new Error("Unauthorized: Invalid Firebase token");
  }
};
