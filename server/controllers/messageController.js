const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const { encrypt, decrypt } = require("../utils/encryptUtils");
const { createNotification } = require("./notificationController");

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, messageType = 'text', fileUrl, fileName, fileType } = req.body;
  if (!chatId) throw new Error("Invalid data");

  let messageData = {
    sender: req.user._id,
    chat: chatId,
    messageType,
  };

  if (messageType === 'text') {
    if (!content) throw new Error("Message content is required");
    messageData.content = encrypt(content);
  } else if (messageType === 'file') {
    if (!fileUrl) throw new Error("File URL is required");
    messageData.fileUrl = fileUrl;
    messageData.fileName = fileName || 'File';
    messageData.fileType = fileType || 'unknown';
    messageData.content = encrypt(fileName || 'File shared');
  }

  let newMessage = await Message.create(messageData);

  newMessage = await newMessage.populate("sender", "name");
  newMessage = await newMessage.populate("chat");
  newMessage = await User.populate(newMessage, {
    path: "chat.users",
    select: "name email",
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage });
  
  // Create notifications for other chat members
  const chat = newMessage.chat;
  const otherUsers = chat.users.filter(user => user._id.toString() !== req.user._id.toString());
  
  // Create notifications for each user
  const notifications = await Promise.all(
    otherUsers.map(async (user) => {
      const notificationData = {
        recipient: user._id,
        sender: req.user._id,
        chat: chatId,
        type: 'new_message',
        title: chat.isGroupChat ? `New message in ${chat.chatName}` : `New message from ${req.user.name}`,
        message: messageType === 'file' 
          ? `${req.user.name} shared a file: ${fileName || 'File'}` 
          : `${req.user.name}: ${content}`,
        data: {
          messageId: newMessage._id,
          messageType: messageType,
          fileName: fileName
        }
      };
      return await createNotification(notificationData);
    })
  );
  
  const decryptedMessage = {
    ...newMessage._doc,
    content: decrypt(newMessage.content),
    notifications: notifications.filter(n => n !== null)
  };
  res.json(decryptedMessage);
});

const allMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name email")
    .populate("chat")
    .populate("readBy", "name");

  const decryptedMessages = messages.map(msg => {
    try {
      return {
        ...msg._doc,
        content: decrypt(msg.content),
      };
    } catch (err) {
      console.error('Decryption error for message:', msg._id, err);
      return null;
    }
  }).filter(msg => msg !== null); // Filter out failed decryptions

  res.json(decryptedMessages);
});

const searchMessages = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  const messages = await Message.find({
    chat: req.params.chatId,
  })
    .populate("sender", "name email")
    .populate("chat");

  const decryptedResults = messages
    .map((msg) => ({
      ...msg._doc,
      content: decrypt(msg.content),
    }))
    .filter((msg) =>
      msg.content && msg.content.toLowerCase().includes(keyword.toLowerCase())
    );

  res.json(decryptedResults);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  
  const message = await Message.findById(messageId);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  // Only sender can delete their message
  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this message");
  }

  // Soft delete: update content and set isDeleted
  await Message.findByIdAndUpdate(messageId, {
    content: encrypt("This message was deleted"),
    isDeleted: true,
    fileUrl: null,
    fileName: null,
    fileType: null,
    messageType: 'text'
  });

  res.json({ message: "Message deleted successfully" });
});

const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  
  const message = await Message.findById(messageId);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  // Add user to readBy array if not already there
  if (!message.readBy.includes(req.user._id)) {
    message.readBy.push(req.user._id);
    await message.save();
  }

  // Populate the readBy field and return updated message
  const updatedMessage = await Message.findById(messageId)
    .populate("sender", "name")
    .populate("readBy", "name");

  res.json({ 
    message: "Message marked as read",
    updatedMessage 
  });
});

const markChatAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  
  // Find all unread messages in the chat
  const unreadMessages = await Message.find({
    chat: chatId,
    sender: { $ne: req.user._id },
    readBy: { $ne: req.user._id }
  });

  // Mark all unread messages in the chat as read
  await Message.updateMany(
    { 
      chat: chatId, 
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id }
    },
    { $push: { readBy: req.user._id } }
  );

  // Emit socket events for each message that was marked as read
  unreadMessages.forEach(message => {
    // This will be handled by the socket.io server
    // The frontend will emit these events
  });

  res.json({ 
    message: "Chat marked as read",
    unreadCount: unreadMessages.length
  });
});

module.exports = { 
  sendMessage, 
  allMessages, 
  searchMessages, 
  deleteMessage, 
  markMessageAsRead, 
  markChatAsRead 
};

