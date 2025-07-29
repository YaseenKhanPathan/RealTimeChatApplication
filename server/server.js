const dotenv = require('dotenv');
dotenv.config();
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store typing users
const typingUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join chat', (room) => {
    socket.join(room);
    console.log('User joined room:', room);
  });

  socket.on('typing', (room) => {
    socket.to(room).emit('typing', room);
  });

  socket.on('stop typing', (room) => {
    socket.to(room).emit('stop typing', room);
  });

  socket.on('new message', (newMessageReceived) => {
    let chat = newMessageReceived.chat;
    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id === newMessageReceived.sender._id) return;
      socket.in(user._id).emit('message received', newMessageReceived);
    });
  });

  socket.on('message deleted', (data) => {
    let chat = data.chat;
    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id === data.sender._id) return;
      socket.in(user._id).emit('message deleted', data);
    });
  });

  socket.on('message read', (data) => {
    let chat = data.chat;
    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id === data.readBy._id) return;
      socket.in(user._id).emit('message read', data);
    });
  });

  socket.on('user status', (data) => {
    socket.broadcast.emit('user status update', data);
  });

  // Notification events
  socket.on('notification sent', (notification) => {
    socket.in(notification.recipient._id || notification.recipient).emit('new notification', notification);
  });

  socket.on('notification read', (data) => {
    socket.in(data.senderId).emit('notification read update', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// ✅ Connect to MongoDB using separate config
connectDB();

// ✅ Routes
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// ✅ Default route
app.get('/', (req, res) => {
  res.send('🚀 API is running...');
});

// ✅ Server Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
