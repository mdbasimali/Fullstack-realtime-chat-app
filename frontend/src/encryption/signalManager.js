import { KeyHelper, SignalProtocolAddress, SessionBuilder, SessionCipher } from '@privacyresearch/libsignal-protocol-typescript';
import { SignalProtocolStore } from './sessionStore';
import { axiosInstance } from '../lib/axios';

class SignalManager {
  constructor() {
    this.store = null;
    this.deviceId = null;
    this.address = null;
    this.initialized = false;
  }

  async init(userId, deviceId = "default") {
    if (this.initialized) return;
    this.deviceId = deviceId;
    this.address = new SignalProtocolAddress(userId, 1); // Device ID 1 conventionally
    this.store = new SignalProtocolStore(deviceId);
    
    let identityKeyPair = await this.store.getIdentityKeyPair();
    if (!identityKeyPair) {
      await this.generateAndUploadKeys();
    }
    
    this.initialized = true;
  }

  async generateAndUploadKeys() {
    // 1. Identity Key Pair
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    const registrationId = KeyHelper.generateRegistrationId();
    await this.store.saveIdentity(identityKeyPair, registrationId);

    // 2. Signed PreKey
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
    await this.store.storeSignedPreKey(1, signedPreKey);

    // 3. One-Time PreKeys (generate 50 for now)
    const preKeys = [];
    for (let i = 1; i <= 50; i++) {
      const preKey = await KeyHelper.generatePreKey(i);
      await this.store.storePreKey(i, preKey);
      preKeys.push({
        keyId: preKey.keyId,
        publicKey: this.arrayBufferToBase64(preKey.keyPair.pubKey)
      });
    }

    // Upload to server
    await axiosInstance.post('/keys/upload', {
      deviceId: this.deviceId,
      identityPublicKey: this.arrayBufferToBase64(identityKeyPair.pubKey),
      registrationId,
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: this.arrayBufferToBase64(signedPreKey.keyPair.pubKey),
        signature: this.arrayBufferToBase64(signedPreKey.signature)
      },
      preKeys
    });
  }

  async establishSession(remoteUserId, remoteDeviceId) {
    const remoteAddress = new SignalProtocolAddress(remoteUserId, 1);
    
    // Fetch prekeys from server
    const response = await axiosInstance.get(`/keys/device/${remoteDeviceId}`);
    const bundle = response.data;

    const builder = new SessionBuilder(this.store, remoteAddress);
    
    const preKeyBundle = {
      identityKey: this.base64ToArrayBuffer(bundle.identityPublicKey),
      registrationId: bundle.registrationId,
      preKey: bundle.preKey ? {
        keyId: bundle.preKey.keyId,
        publicKey: this.base64ToArrayBuffer(bundle.preKey.publicKey)
      } : undefined,
      signedPreKey: {
        keyId: bundle.signedPreKey.keyId,
        publicKey: this.base64ToArrayBuffer(bundle.signedPreKey.publicKey),
        signature: this.base64ToArrayBuffer(bundle.signedPreKey.signature)
      }
    };

    await builder.processPreKey(preKeyBundle);
  }

  async encryptMessage(remoteUserId, plaintext) {
    const remoteAddress = new SignalProtocolAddress(remoteUserId, 1);
    const cipher = new SessionCipher(this.store, remoteAddress);
    
    const hasSession = await this.store.loadSession(remoteAddress.toString());
    if (!hasSession) {
      // Typically, you'd need the remoteDeviceId to fetch the bundle
      // We will assume a default or fetch device lists here
      // For brevity, assuming establishing session handled externally or passing deviceId
      throw new Error("Session not established. Establish session first.");
    }

    const encoder = new TextEncoder();
    const ciphertext = await cipher.encrypt(encoder.encode(plaintext).buffer);
    return ciphertext;
  }

  async decryptMessage(remoteUserId, ciphertextObj) {
    const remoteAddress = new SignalProtocolAddress(remoteUserId, 1);
    const cipher = new SessionCipher(this.store, remoteAddress);

    let plaintext;
    if (ciphertextObj.type === 3) { // PreKey Whisper Message
      plaintext = await cipher.decryptPreKeyWhisperMessage(ciphertextObj.body, 'binary');
    } else { // Whisper Message
      plaintext = await cipher.decryptWhisperMessage(ciphertextObj.body, 'binary');
    }
    
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(plaintext);
  }

  // Utilities
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const signalManager = new SignalManager();
