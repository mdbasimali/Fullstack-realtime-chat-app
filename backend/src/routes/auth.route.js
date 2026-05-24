import express from "express";
import { checkAuth, login, logout, signup, updateProfile, googleAuth, getGoogleClientId, googleRedirect, linkDevice, getLinkedDevices, revokeLinkedDevice, firebaseLogin, checkUsername, createPin, changePin, verifyPin, deleteAccount, uploadPublicKey } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router =express.Router()

router.post("/signup",signup)
router.post("/login",login);
router.post("/logout",logout);
router.post("/google", googleAuth);
router.post("/google-redirect", googleRedirect);
router.get("/google-client-id", getGoogleClientId);
router.post("/firebase-login", firebaseLogin);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/create-pin", protectRoute, createPin);
router.put("/change-pin", protectRoute, changePin);
router.post("/verify-pin", protectRoute, verifyPin);
router.get("/check", protectRoute, checkAuth);
router.get("/check-username", checkUsername);

router.post("/link-device", protectRoute, linkDevice);
router.get("/linked-devices", protectRoute, getLinkedDevices);
router.delete("/linked-devices/:sessionId", protectRoute, revokeLinkedDevice);

router.post("/delete-account", protectRoute, deleteAccount);
router.put("/keys", protectRoute, uploadPublicKey);

export default router