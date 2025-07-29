# 💬 Real-Time Chat Application

A full-stack real-time chat application built with React.js, Node.js, Express.js, MongoDB, and Socket.IO. This application supports one-to-one messaging, group chats, real-time notifications, message search, file sharing, and online/offline status tracking.

## ✨ Features

### 🔐 Authentication & User Management
- User registration and login
- JWT-based authentication
- User profile management (name, email, bio, phone, profile picture)
- Online/Offline status tracking

### 💬 Chat Features
- **One-to-One Messaging**: Private conversations between users
- **Group Chats**: Create and manage group conversations
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Message Read Receipts**: See when messages are read
- **Typing Indicators**: Real-time typing status
- **Message Search**: Search through chat history
- **Message Deletion**: Delete your own messages

### 📁 File & Media Support
- File attachment and sharing
- Emoji picker integration
- Support for various file types

### 🔔 Notifications
- Real-time notifications for new messages
- Group invitation notifications
- Push notifications via Socket.IO

### 👥 Group Management
- Create new group chats
- Add members to existing groups
- View group member lists
- Group admin privileges

## 🛠️ Tech Stack

### Frontend
- **React.js**: User interface
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP requests
- **Emoji Mart**: Emoji picker
- **CSS3**: Styling with animations

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: MongoDB ODM
- **Socket.IO**: Real-time communication
- **JWT**: Authentication
- **bcryptjs**: Password hashing

## 📁 Project Structure

```
RealTimeChatApp/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Chat.js        # Main chat interface
│   │   │   ├── ChatPage.js    # Chat list and navigation  
│   │   │   ├── Login.js       # Login page
│   │   │   └── Register.js    # Registration page
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── controllers/
│   │   ├── userController.js      # User management
│   │   ├── chatController.js      # Chat operations
│   │   ├── messageController.js   # Message handling
│   │   └── notificationController.js # Notifications
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT authentication
│   │   └── errorMiddleware.js     # Error handling
│   ├── models/
│   │   ├── userModel.js           # User schema
│   │   ├── chatModel.js           # Chat schema
│   │   ├── messageModel.js        # Message schema
│   │   └── notificationModel.js   # Notification schema
│   ├── routes/
│   │   ├── userRoutes.js          # User API routes
│   │   ├── chatRoutes.js          # Chat API routes
│   │   ├── messageRoutes.js       # Message API routes
│   │   └── notificationRoutes.js  # Notification API routes
│   ├── utils/
│   │   └── generateToken.js       # JWT token generation
│   ├── server.js                  # Main server file
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/realtime-chat-app.git
cd realtime-chat-app
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the server directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```

### 4. Start the Application

**Start Backend Server:**
```bash
cd server
npm start
```

**Start Frontend (in a new terminal):**
```bash
cd client
npm start
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - User login
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/status` - Update user status

### Chat Management
- `GET /api/chat` - Get user's chats
- `POST /api/chat` - Create/access one-to-one chat
- `POST /api/chat/group` - Create group chat
- `PUT /api/chat/group/add` - Add members to group

### Messages
- `GET /api/message/:chatId` - Get chat messages
- `POST /api/message` - Send new message
- `PUT /api/message/:chatId/read` - Mark chat as read
- `DELETE /api/message/message/:messageId` - Delete message
- `GET /api/message/:chatId/search` - Search messages

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

## 🔌 Socket.IO Events

### Client → Server
- `setup` - Initialize user connection
- `join chat` - Join specific chat room
- `new message` - Send new message
- `typing` / `stop typing` - Typing indicators
- `user status` - Update user status

### Server → Client
- `connected` - Connection established
- `message received` - New message received
- `message read` - Message read receipt
- `typing` / `stop typing` - Typing indicators
- `user status update` - User status changed
- `new notification` - New notification received

## 🎨 Features in Detail

### Real-time Communication
- Instant message delivery using WebSocket connections
- Live typing indicators
- Online/offline status updates
- Read receipts for messages

### User Interface
- Clean, modern design with smooth animations
- Responsive layout for mobile and desktop
- Emoji picker integration
- File attachment support
- Message search functionality

### Security
- JWT-based authentication
- Password hashing with bcryptjs
- Protected API routes
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Yaseen**
- GitHub: [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- MongoDB for database
- React.js community for excellent documentation
- All contributors and testers

---

⭐ If you found this project helpful, please give it a star!
