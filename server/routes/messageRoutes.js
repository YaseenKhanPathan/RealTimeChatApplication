const express = require("express");
const { 
  sendMessage, 
  allMessages, 
  searchMessages, 
  deleteMessage, 
  markMessageAsRead, 
  markChatAsRead 
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/:chatId/search").get(protect, searchMessages);
router.route("/:chatId/read").put(protect, markChatAsRead);
router.route("/message/:messageId").delete(protect, deleteMessage);
router.route("/message/:messageId/read").put(protect, markMessageAsRead);

module.exports = router;

