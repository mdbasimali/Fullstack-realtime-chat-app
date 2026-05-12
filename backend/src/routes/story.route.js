import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createStory, getStories, deleteStory } from "../controllers/story.controller.js";

const router = express.Router();

router.get("/", protectRoute, getStories);
router.post("/", protectRoute, createStory);
router.delete("/:id", protectRoute, deleteStory);

export default router;
