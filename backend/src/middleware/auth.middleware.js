import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1] || req.query.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (decoded.sessionId) {
      const isSessionActive = user.linkedDevices.some(
        (device) => device.sessionId === decoded.sessionId
      );
      if (!isSessionActive) {
        return res.status(401).json({ message: "Unauthorized - Session has been revoked" });
      }
      // Update last active timestamp asynchronously
      User.updateOne(
        { _id: user._id, "linkedDevices.sessionId": decoded.sessionId },
        { $set: { "linkedDevices.$.lastActive": new Date() } }
      ).catch((err) => console.error("Error updating session lastActive:", err));
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};