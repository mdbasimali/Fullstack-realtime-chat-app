import { Queue, Worker } from "bullmq";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import Story from "../models/story.model.js";
import Message from "../models/message.model.js";
import DeletedAccount from "../models/deletedAccount.model.js";
import DeletionJob from "../models/deletionJob.model.js";
import { io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

import Redis from "ioredis";

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times === 1) {
      console.warn("⚠️ Redis connection failed. Make sure Redis is running if you want background jobs to process!");
    }
    return 10000;
  }
};

const connection = new Redis(redisOptions);

// Prevent unhandled error events from crashing/spamming the Node process
connection.on("error", (err) => {
  // Silently ignore ECONNREFUSED since we are already handling retries
  if (err.code !== "ECONNREFUSED") {
    console.error("Redis Error:", err);
  }
});

export const deletionQueue = new Queue("account-deletion", {
  connection,
});

const updateJobProgress = async (jobId, progress, status = "processing") => {
  await DeletionJob.findOneAndUpdate(
    { jobId },
    { progress, status },
    { new: true }
  );
};

const processDeletion = async (job) => {
  const { userId } = job.data;
  
  try {
    await updateJobProgress(job.id, 10);
    
    // Phase 1: Immediate cleanup & anonymization
    const user = await User.findById(userId);
    if (!user) {
      await updateJobProgress(job.id, 100, "completed");
      return;
    }

    const randomHash = `deleted_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    user.email = `${randomHash}@deleted.chatzone.app`;
    user.username = randomHash;
    user.fullName = "Deleted User";
    user.profilePic = "";
    user.phoneNumber = "";
    user.pin = "";
    user.about = "This account was deleted.";
    user.linkedDevices = [];
    user.pushSubscriptions = [];
    user.syncedContacts = [];
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();
    
    await updateJobProgress(job.id, 30);

    // Phase 2: Relations (Remove from other users' contacts and blocked lists)
    await User.updateMany(
      { contacts: userId },
      { $pull: { contacts: userId } }
    );
    await User.updateMany(
      { blockedUsers: userId },
      { $pull: { blockedUsers: userId } }
    );

    await updateJobProgress(job.id, 50);

    // Phase 3: Groups Cleanup
    const userGroups = await Group.find({ members: userId });
    for (const group of userGroups) {
      // Remove from members and admins
      group.members = group.members.filter(m => m.toString() !== userId.toString());
      group.admins = group.admins.filter(a => a.toString() !== userId.toString());

      // If user was the creator, we might need to assign a new creator if admins exist, or the oldest member
      if (group.creator.toString() === userId.toString()) {
        if (group.admins.length > 0) {
          group.creator = group.admins[0];
        } else if (group.members.length > 0) {
          group.creator = group.members[0];
          group.admins.push(group.members[0]);
        } else {
          // Empty group, maybe delete it later or let it be orphaned
        }
      }
      await group.save();
    }

    await updateJobProgress(job.id, 70);

    // Phase 4: Stories Cleanup
    await Story.deleteMany({ userId });

    await updateJobProgress(job.id, 90);

    // Phase 5: Chats & Messages
    // We choose to anonymize or delete messages depending on privacy policy.
    // For WhatsApp style, we keep messages but they show as from "Deleted User".
    // Since we changed the user profile to "Deleted User", it naturally works.
    // However, we should delete personal media from Cloudinary if possible (optional step).
    
    // Create deleted account record
    await DeletedAccount.create({
      userId,
      deletedAt: new Date(),
      scheduledPermanentDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: "completed"
    });

    await updateJobProgress(job.id, 100, "completed");

    // Notify connected clients that user is deleted (to update UI if they have chats)
    io.emit("userDeleted", { userId });

  } catch (error) {
    console.error(`Deletion job ${job.id} failed:`, error);
    await DeletionJob.findOneAndUpdate(
      { jobId: job.id },
      { 
        status: "failed", 
        $push: { errorLog: { message: error.message } } 
      }
    );
    throw error; // Let BullMQ handle retries
  }
};

export const deletionWorker = new Worker("account-deletion", processDeletion, {
  connection,
  autorun: false,
});

// Start the worker
deletionWorker.run();

console.log("BullMQ Deletion Worker initialized");
