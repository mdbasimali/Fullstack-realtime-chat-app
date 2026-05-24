import { get, set, del } from "idb-keyval";

// Generate ECDH P-256 Key Pair
export const generateECDHKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
};

// Derive AES-GCM 256 Shared Secret
export const deriveSharedKey = async (privateKeyJwk, publicKeyJwk) => {
  if (!privateKeyJwk || !publicKeyJwk) return null;
  
  try {
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );

    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );

    return await window.crypto.subtle.deriveKey(
      { name: "ECDH", public: publicKey },
      privateKey,
      { name: "AES-GCM", length: 256 },
      false, // We don't need to extract the raw AES key
      ["encrypt", "decrypt"]
    );
  } catch (err) {
    console.error("Key derivation failed:", err);
    return null;
  }
};

// ArrayBuffer to Base64
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Encrypt text using derived AES-GCM key
export const encryptAES = async (text, key, customIv = null) => {
  const iv = customIv || window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedText
  );

  return {
    ciphertextB64: bufferToBase64(ciphertextBuffer),
    ivB64: bufferToBase64(iv.buffer)
  };
};

// Decrypt text using derived AES-GCM key
export const decryptAES = async (ciphertextB64, ivB64, key) => {
  try {
    const ciphertextBuffer = base64ToBuffer(ciphertextB64);
    const iv = new Uint8Array(base64ToBuffer(ivB64));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertextBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    // Silently return fallback text if decryption fails (e.g., due to rotated keys or corrupted data)
    return "[Message could not be decrypted]";
  }
};

// Decrypt an ArrayBuffer directly using derived AES-GCM key
export const decryptAESBuffer = async (ciphertextBuffer, ivB64, key) => {
  try {
    const iv = new Uint8Array(base64ToBuffer(ivB64));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertextBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("decryptAESBuffer failed:", err);
    return null;
  }
};

// IndexedDB wrappers for Private Key
export const saveMyPrivateKey = async (userId, jwk) => {
  await set(`private_key_${userId}`, jwk);
};

export const getMyPrivateKey = async (userId) => {
  return await get(`private_key_${userId}`);
};

export const deleteMyPrivateKey = async (userId) => {
  await del(`private_key_${userId}`);
};

// --- Advanced E2EE Features ---

// 1. Safety Number / Fingerprint Generation (SHA-256 hash of the public key)
export const generateFingerprint = async (publicKeyJwk) => {
  if (!publicKeyJwk) return null;
  // Convert JWK to deterministic string representation
  const keyString = JSON.stringify({
    crv: publicKeyJwk.crv,
    ext: publicKeyJwk.ext,
    key_ops: publicKeyJwk.key_ops,
    kty: publicKeyJwk.kty,
    x: publicKeyJwk.x,
    y: publicKeyJwk.y
  });
  
  const encodedText = new TextEncoder().encode(keyString);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encodedText);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert hash bytes to a numeric string (60 digits like Signal)
  let fingerprint = "";
  for (let i = 0; i < hashArray.length; i++) {
    fingerprint += hashArray[i].toString().padStart(3, "0");
  }
  return fingerprint.substring(0, 60); // 60 digits max
};

// 2. Key Rotation
export const rotateKeys = async (userId) => {
  // Generate a new key pair
  const newKeyPair = await generateECDHKeyPair();
  
  // Overwrite local private key
  await saveMyPrivateKey(userId, newKeyPair.privateKeyJwk);
  
  return newKeyPair.publicKeyJwk;
};

// 3. Encrypted Backups (Export)
export const exportEncryptedBackup = async (userId, dataObj, password) => {
  // PBKDF2 Key derivation from password
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const dataString = JSON.stringify(dataObj);
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    enc.encode(dataString)
  );

  return {
    ciphertextB64: bufferToBase64(ciphertextBuffer),
    ivB64: bufferToBase64(iv.buffer),
    saltB64: bufferToBase64(salt.buffer),
  };
};

// 4. Encrypted Backups (Import)
export const importEncryptedBackup = async (backupObj, password) => {
  try {
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const salt = new Uint8Array(base64ToBuffer(backupObj.saltB64));
    
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const ciphertextBuffer = base64ToBuffer(backupObj.ciphertextB64);
    const iv = new Uint8Array(base64ToBuffer(backupObj.ivB64));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      ciphertextBuffer
    );

    const dataString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(dataString);
  } catch (err) {
    console.error("Backup Decryption failed:", err);
    return null;
  }
};
