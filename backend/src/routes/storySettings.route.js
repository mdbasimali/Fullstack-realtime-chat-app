import express from "express";
import { getStorySettings, updateStorySettings } from "../controllers/storySettings.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getStorySettings);
router.patch("/", protectRoute, updateStorySettings);

export default router;
