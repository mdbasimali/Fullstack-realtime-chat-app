import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, addContact, removeContact, blockContact, deleteConversation, deleteMessage, clearCallLogs, syncContacts, downloadFile, getAllMediaMessages } from "../controllers/message.controller.js";

const router = express.Router();


router.get("/users",protectRoute, getUsersForSidebar);
router.get("/media/all", protectRoute, getAllMediaMessages);
router.get("/download", protectRoute, downloadFile);
router.post("/add-contact", protectRoute, addContact);
router.post("/sync-contacts", protectRoute, syncContacts);
router.post("/remove-contact", protectRoute, removeContact);
router.post("/block-contact", protectRoute, blockContact);
router.get("/:id",protectRoute,getMessages);

router.post("/send/:id", protectRoute,sendMessage);
router.delete("/conversation/:id", protectRoute, deleteConversation);
router.delete("/message/:id", protectRoute, deleteMessage);
router.delete("/call-logs/:id", protectRoute, clearCallLogs);



export default router;