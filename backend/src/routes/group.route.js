import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getMyGroups,
  getExploreGroups,
  joinGroup,
  leaveGroup,
  getGroupMessages,
  sendGroupMessage,
  addMember,
} from "../controllers/group.controller.js";

const router = express.Router();

// List joined groups & Create new group
router.get("/", protectRoute, getMyGroups);
router.post("/", protectRoute, createGroup);

// Explore public groups
router.get("/explore", protectRoute, getExploreGroups);

// Join / Leave group operations
router.post("/join/:groupId", protectRoute, joinGroup);
router.post("/leave/:groupId", protectRoute, leaveGroup);
router.post("/:groupId/add-member", protectRoute, addMember);

// Group messaging endpoints
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);

export default router;
