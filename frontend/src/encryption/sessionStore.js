import Dexie from 'dexie';

export const db = new Dexie('ChatZoneE2EE');
db.version(1).stores({
  identities: 'deviceId, identityKey, registrationId, signedPreKey',
  sessions: 'remoteDeviceId, sessionData',
  preKeys: 'keyId, publicKey, privateKey',
  ratchets: 'remoteDeviceId, state',
  messages: 'messageId, chatId, payload, status'
});

export class SignalProtocolStore {
  constructor(deviceId) {
    this.deviceId = deviceId;
  }

  async getIdentityKeyPair() {
    const data = await db.identities.get(this.deviceId);
    return data ? data.identityKey : undefined;
  }

  async getLocalRegistrationId() {
    const data = await db.identities.get(this.deviceId);
    return data ? data.registrationId : undefined;
  }

  async saveIdentity(identityKey, registrationId) {
    await db.identities.put({
      deviceId: this.deviceId,
      identityKey,
      registrationId
    });
  }

  async storeSession(identifier, record) {
    await db.sessions.put({
      remoteDeviceId: identifier,
      sessionData: record
    });
  }

  async loadSession(identifier) {
    const data = await db.sessions.get(identifier);
    return data ? data.sessionData : undefined;
  }

  async storePreKey(keyId, keyPair) {
    await db.preKeys.put({
      keyId,
      publicKey: keyPair.pubKey,
      privateKey: keyPair.privKey
    });
  }

  async loadPreKey(keyId) {
    const data = await db.preKeys.get(keyId);
    return data;
  }

  async removePreKey(keyId) {
    await db.preKeys.delete(keyId);
  }

  async storeSignedPreKey(keyId, keyPair) {
    await db.identities.update(this.deviceId, {
      signedPreKey: {
        keyId,
        publicKey: keyPair.pubKey,
        privateKey: keyPair.privKey
      }
    });
  }

  async loadSignedPreKey() {
    const data = await db.identities.get(this.deviceId);
    return data ? data.signedPreKey : undefined;
  }
}
