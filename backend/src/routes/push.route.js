import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";

const router = express.Router();

router.post("/subscribe", protectRoute, async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user._id;

    // Add subscription to user if it doesn't exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if subscription already exists
    const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(201).json({ message: "Subscription added successfully" });
  } catch (error) {
    console.error("Error in subscribe route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/unsubscribe", protectRoute, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint } }
    });

    res.status(200).json({ message: "Subscription removed successfully" });
  } catch (error) {
    console.error("Error in unsubscribe route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
