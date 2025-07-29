const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getNotifications);
router.route("/unread-count").get(protect, getUnreadCount);
router.route("/mark-all-read").put(protect, markAllAsRead);
router.route("/:notificationId/read").put(protect, markAsRead);
router.route("/:notificationId").delete(protect, deleteNotification);

module.exports = router;
