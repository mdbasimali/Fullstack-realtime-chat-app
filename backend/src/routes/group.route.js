import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getMyGroups,
  leaveGroup,
  getGroupMessages,
  sendGroupMessage,
  addMember,
  getGroupDetails,
  joinGroupByInvite,
  updateGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

// List joined groups & Create new group
router.get("/", protectRoute, getMyGroups);
router.post("/", protectRoute, createGroup);

// Join / Leave group operations
router.post("/join-invite/:inviteCode", protectRoute, joinGroupByInvite);
router.post("/leave/:groupId", protectRoute, leaveGroup);
router.post("/:groupId/add-member", protectRoute, addMember);

// Get group metadata & members
router.get("/:groupId/details", protectRoute, getGroupDetails);

// Group messaging endpoints
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);

// Update group
router.put("/:groupId/update", protectRoute, updateGroup);

export default router;
