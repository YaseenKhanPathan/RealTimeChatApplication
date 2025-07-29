const asyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");

// Get all notifications for a user
const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user._id })
    .populate("sender", "name pic email")
    .populate("chat", "chatName isGroupChat")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    notifications,
    currentPage: page,
    totalPages: Math.ceil(await Notification.countDocuments({ recipient: req.user._id }) / limit),
  });
});

// Get unread notifications count
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json({ unreadCount: count });
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: req.user._id,
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.status(200).json(notification);
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json({ message: "All notifications marked as read" });
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: req.user._id,
  });

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.status(200).json({ message: "Notification deleted successfully" });
});

// Create notification helper function
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name pic email")
      .populate("chat", "chatName isGroupChat");
    
    return populatedNotification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
