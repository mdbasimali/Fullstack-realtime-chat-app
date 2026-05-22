import express from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getSettings);
router.patch("/", protectRoute, updateSettings);

export default router;
