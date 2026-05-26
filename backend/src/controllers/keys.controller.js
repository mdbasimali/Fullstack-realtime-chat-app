import Device from "../models/device.model.js";
import OneTimePreKey from "../models/oneTimePreKey.model.js";
import User from "../models/user.model.js";

export const uploadKeys = async (req, res) => {
  try {
    const { deviceId, identityPublicKey, registrationId, signedPreKey, preKeys } = req.body;
    const userId = req.user._id;

    // Check if device exists, if so update, else create
    let device = await Device.findOne({ deviceId });
    if (!device) {
      device = new Device({
        deviceId,
        userId,
        identityPublicKey,
        registrationId,
        signedPreKey,
      });
      await device.save();
    } else {
      device.identityPublicKey = identityPublicKey;
      device.registrationId = registrationId;
      device.signedPreKey = signedPreKey;
      device.lastSeen = Date.now();
      await device.save();
    }

    // Save one-time prekeys
    if (preKeys && preKeys.length > 0) {
      const preKeyDocs = preKeys.map((pk) => ({
        deviceId,
        keyId: pk.keyId,
        publicKey: pk.publicKey,
      }));
      // Using insertMany with ordered: false to ignore duplicates
      try {
        await OneTimePreKey.insertMany(preKeyDocs, { ordered: false });
      } catch (err) {
        // Ignore duplicate key errors for prekeys
      }
    }

    res.status(200).json({ message: "Keys uploaded successfully" });
  } catch (error) {
    console.error("Error in uploadKeys:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchKeys = async (req, res) => {
  try {
    const { userIds } = req.body; // Array of user IDs to fetch keys for

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    // Fetch all devices for these users
    const devices = await Device.find({ userId: { $in: userIds } });

    const bundleResponse = {};

    for (const device of devices) {
      if (!bundleResponse[device.userId]) {
        bundleResponse[device.userId] = [];
      }

      // Pop one prekey
      const oneTimePreKey = await OneTimePreKey.findOneAndUpdate(
        { deviceId: device.deviceId, used: false },
        { used: true },
        { new: true, sort: { keyId: 1 } }
      );

      bundleResponse[device.userId].push({
        deviceId: device.deviceId,
        registrationId: device.registrationId,
        identityPublicKey: device.identityPublicKey,
        signedPreKey: device.signedPreKey,
        preKey: oneTimePreKey ? { keyId: oneTimePreKey.keyId, publicKey: oneTimePreKey.publicKey } : null,
      });
    }

    res.status(200).json(bundleResponse);
  } catch (error) {
    console.error("Error in fetchKeys:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDeviceKeys = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const oneTimePreKey = await OneTimePreKey.findOneAndUpdate(
      { deviceId, used: false },
      { used: true },
      { new: true, sort: { keyId: 1 } }
    );

    res.status(200).json({
      deviceId: device.deviceId,
      registrationId: device.registrationId,
      identityPublicKey: device.identityPublicKey,
      signedPreKey: device.signedPreKey,
      preKey: oneTimePreKey ? { keyId: oneTimePreKey.keyId, publicKey: oneTimePreKey.publicKey } : null,
    });
  } catch (error) {
    console.error("Error in getDeviceKeys:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
