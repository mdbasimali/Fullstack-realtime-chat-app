import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { get, set } from 'idb-keyval';
import { bufferToBase64, base64ToBuffer } from './crypto';

// --- Capacitor Native Biometric ---
const isNativeBiometricsAvailable = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch (err) {
    return false;
  }
};

const enrollNativeBiometrics = async (pin) => {
  try {
    await NativeBiometric.setCredentials({
      username: 'chatzone_user',
      password: pin,
      server: 'chatzone_local_encryption',
    });
    return true;
  } catch (err) {
    console.error("Native Biometric Enrollment Failed:", err);
    return false;
  }
};

const unlockWithNativeBiometrics = async () => {
  try {
    const credentials = await NativeBiometric.getCredentials({
      server: 'chatzone_local_encryption',
    });
    return credentials.password; // Returns the PIN
  } catch (err) {
    console.error("Native Biometric Unlock Failed:", err);
    return null;
  }
};

export const deleteNativeBiometrics = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeBiometric.deleteCredentials({ server: 'chatzone_local_encryption' });
  } catch (err) {}
};

// --- WebAuthn PRF (Passkeys) for PWA ---

const isWebAuthnPrfAvailable = async () => {
  if (Capacitor.isNativePlatform()) return false;
  if (!window.PublicKeyCredential) return false;
  
  // Check if PRF extension is supported by the browser
  const supportedExtensions = await PublicKeyCredential.getClientExtensionResults ? 
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ? true : false : false;
  // Note: accurate PRF support check is tricky without attempting creation, 
  // but we assume modern browsers that support platform authenticators support it.
  const isPlatformAuthAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  return isPlatformAuthAvailable;
};

// We need a stable random salt per user for PRF
const getPrfSalt = async (userId) => {
  let saltStr = await get(`prf_salt_${userId}`);
  if (!saltStr) {
    const salt = window.crypto.getRandomValues(new Uint8Array(32));
    saltStr = bufferToBase64(salt);
    await set(`prf_salt_${userId}`, saltStr);
  }
  return new Uint8Array(base64ToBuffer(saltStr));
};

const enrollWebAuthnPrf = async (userId, pin) => {
  try {
    const salt = await getPrfSalt(userId);
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userIdBuffer = new TextEncoder().encode(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "ChatZone", id: window.location.hostname },
        user: {
          id: userIdBuffer,
          name: "ChatZone User",
          displayName: "ChatZone Secure Unlock",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        extensions: {
          prf: {
            eval: { first: salt },
          },
        },
      },
    });

    // Extract the PRF output (symmetric key)
    const extResults = credential.getClientExtensionResults();
    if (!extResults.prf || !extResults.prf.results || !extResults.prf.results.first) {
      console.warn("PRF Extension not supported by authenticator.");
      return false; // Browser supported it, but the specific authenticator (e.g., older YubiKey) didn't
    }

    const symmetricKeyRaw = new Uint8Array(extResults.prf.results.first);
    
    // Use the PRF symmetric key to encrypt the PIN using AES-GCM
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw", symmetricKeyRaw, { name: "AES-GCM" }, false, ["encrypt"]
    );
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedPinBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      new TextEncoder().encode(pin)
    );

    // Save the encrypted PIN and the credential ID
    await set(`webauthn_credId_${userId}`, bufferToBase64(new Uint8Array(credential.rawId)));
    await set(`webauthn_encrypted_pin_${userId}`, {
      encryptedB64: bufferToBase64(encryptedPinBuffer),
      ivB64: bufferToBase64(iv)
    });

    return true;
  } catch (err) {
    console.error("WebAuthn PRF Enrollment Failed:", err);
    return false;
  }
};

const unlockWithWebAuthnPrf = async (userId) => {
  try {
    const credIdB64 = await get(`webauthn_credId_${userId}`);
    const encryptedPinData = await get(`webauthn_encrypted_pin_${userId}`);
    if (!credIdB64 || !encryptedPinData) return null;

    const salt = await getPrfSalt(userId);
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: base64ToBuffer(credIdB64),
          type: "public-key",
        }],
        userVerification: "required",
        extensions: {
          prf: {
            eval: { first: salt },
          },
        },
      },
    });

    const extResults = assertion.getClientExtensionResults();
    if (!extResults.prf || !extResults.prf.results || !extResults.prf.results.first) {
      return null;
    }

    const symmetricKeyRaw = new Uint8Array(extResults.prf.results.first);
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw", symmetricKeyRaw, { name: "AES-GCM" }, false, ["decrypt"]
    );

    const decryptedPinBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(encryptedPinData.ivB64)) },
      cryptoKey,
      base64ToBuffer(encryptedPinData.encryptedB64)
    );

    return new TextDecoder().decode(decryptedPinBuffer);
  } catch (err) {
    console.error("WebAuthn PRF Unlock Failed:", err);
    return null;
  }
};

export const deleteWebAuthnData = async (userId) => {
  await set(`webauthn_credId_${userId}`, null);
  await set(`webauthn_encrypted_pin_${userId}`, null);
};


// --- Unified Export ---

export const isBiometricsAvailable = async () => {
  if (Capacitor.isNativePlatform()) {
    return await isNativeBiometricsAvailable();
  } else {
    return await isWebAuthnPrfAvailable();
  }
};

export const enrollBiometrics = async (userId, pin) => {
  if (Capacitor.isNativePlatform()) {
    const success = await enrollNativeBiometrics(pin);
    return success;
  } else {
    const success = await enrollWebAuthnPrf(userId, pin);
    return success;
  }
};

export const unlockWithBiometrics = async (userId) => {
  if (Capacitor.isNativePlatform()) {
    return await unlockWithNativeBiometrics();
  } else {
    return await unlockWithWebAuthnPrf(userId);
  }
};
