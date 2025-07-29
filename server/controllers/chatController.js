const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const { createNotification } = require("./notificationController");

const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.sendStatus(400);

  let chat = await Chat.findOne({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  chat = await User.populate(chat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (chat) return res.send(chat);

  const createdChat = await Chat.create({
    chatName: "sender",
    isGroupChat: false,
    users: [req.user._id, userId],
  });

  const fullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "-password");
  res.status(200).json(fullChat);
});

const createGroupChat = asyncHandler(async (req, res) => {
  const { name, users } = req.body;
  
  if (!name || !users) {
    res.status(400);
    throw new Error("Please fill all the fields");
  }
  
  let parsedUsers = JSON.parse(users);
  parsedUsers.push(req.user._id);
  
  const groupChat = await Chat.create({
    chatName: name,
    users: parsedUsers,
    isGroupChat: true,
    groupAdmin: req.user._id,
  });
  
  const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
    .populate("users", "-password")
    .populate("groupAdmin", "-password");
    
  res.status(200).json(fullGroupChat);
});

const fetchChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 });

  const populatedChats = await User.populate(chats, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  res.status(200).send(populatedChats);
});

const addMembersToGroup = asyncHandler(async (req, res) => {
  const { chatId, users } = req.body;
  
  if (!chatId || !users) {
    res.status(400);
    throw new Error("Please provide chat ID and users to add");
  }
  
  let parsedUsers;
  try {
    parsedUsers = JSON.parse(users);
  } catch (error) {
    parsedUsers = users; // In case it's already an array
  }
  
  // Find the chat and verify it's a group chat
  const chat = await Chat.findById(chatId);
  
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }
  
  if (!chat.isGroupChat) {
    res.status(400);
    throw new Error("This is not a group chat");
  }
  
  // Check if the requester is the group admin or already a member
  if (!chat.users.includes(req.user._id)) {
    res.status(403);
    throw new Error("You are not authorized to add members to this group");
  }
  
  // Filter out users who are already in the group
  const existingUserIds = chat.users.map(user => user.toString());
  const newUserIds = parsedUsers.filter(userId => !existingUserIds.includes(userId));
  
  if (newUserIds.length === 0) {
    res.status(400);
    throw new Error("All selected users are already in the group");
  }
  
  // Add new users to the chat
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: { $each: newUserIds } }
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");
  
  // Create notifications for the newly added users
  try {
    const notificationPromises = newUserIds.map(async (userId) => {
      return await createNotification({
        recipient: userId,
        sender: req.user._id,
        type: 'GROUP_INVITE',
        message: `${req.user.name} added you to the group "${updatedChat.chatName}"`,
        relatedChat: chatId
      });
    });
    
    await Promise.all(notificationPromises);
    
    // Emit socket notification to newly added users if socket.io is available
    if (req.io) {
      newUserIds.forEach(userId => {
        req.io.to(userId).emit('newNotification', {
          type: 'GROUP_INVITE',
          message: `${req.user.name} added you to the group "${updatedChat.chatName}"`,
          sender: {
            _id: req.user._id,
            name: req.user.name,
            pic: req.user.pic
          },
          relatedChat: updatedChat,
          createdAt: new Date()
        });
      });
    }
  } catch (notificationError) {
    console.error('Error creating notifications for added members:', notificationError);
    // Don't fail the main operation if notification creation fails
  }
    
  res.status(200).json(updatedChat);
});

module.exports = { accessChat, createGroupChat, fetchChats, addMembersToGroup };

