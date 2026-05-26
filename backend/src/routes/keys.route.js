import express from "express";
import { uploadKeys, fetchKeys, getDeviceKeys } from "../controllers/keys.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", protectRoute, uploadKeys);
router.post("/fetch", protectRoute, fetchKeys);
router.get("/device/:deviceId", protectRoute, getDeviceKeys);

export default router;
