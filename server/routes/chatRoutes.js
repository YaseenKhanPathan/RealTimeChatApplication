const express = require("express");
const { accessChat, createGroupChat, fetchChats, addMembersToGroup } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, accessChat).get(protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router.route("/group/add").put(protect, addMembersToGroup);

module.exports = router;

