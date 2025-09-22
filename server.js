const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { userJoin, getCurrentUser, userLeave, getRoomUsers, updateUserStatus } = require('./utils/users');
const formatMessage = require('./utils/messages');
const MessageHistory = require('./utils/messageHistory');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const botName = 'ChatifyBot';

// Initialize message history
const messageHistory = new MessageHistory();

// Middleware to parse JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve static files from the 'views' directory
app.use(express.static('views'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('./package.json').version
  });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle chat room join
app.post('/join', (req, res) => {
  const { name, roomCode } = req.body;
  
  if (name && roomCode) {
    res.redirect(`/transfer-screen.html?redirect=${encodeURIComponent(`/chat.html?name=${encodeURIComponent(name)}&room=${encodeURIComponent(roomCode)}`)}`);
  } else {
    res.redirect('/?error=invalid');
  }
});
  // Run when client connects
  io.on('connection', socket => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinRoom', ({ username, room }) => {
      const user = userJoin(socket.id, username, room);
      socket.join(user.room);

      // Send message history to the user
      const history = messageHistory.getMessages(user.room, 50);
      socket.emit('messageHistory', history);

      // Welcome current user
      const welcomeMessage = formatMessage(botName, `Welcome to ${user.room}, ${user.username}! 🎉`);
      socket.emit('message', welcomeMessage);
      messageHistory.addMessage(user.room, welcomeMessage);

      // Broadcast when a user connects
      const joinMessage = formatMessage(botName, `${user.username} joined the server`);
      socket.broadcast
        .to(user.room)
        .emit('message', joinMessage);
      messageHistory.addMessage(user.room, joinMessage);

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });

      // Typing indicators
      socket.on('typing', () => {
        const user = getCurrentUser(socket.id);
        if (user) {
          socket.broadcast.to(user.room).emit('typing', user.username);
        }
      });
    
      socket.on('stopTyping', () => {
        const user = getCurrentUser(socket.id);
        if (user) {
          socket.broadcast.to(user.room).emit('stopTyping', user.username);
        }
      });
    });

    // Listen for chatMessage
    socket.on('chatMessage', msg => {
      const user = getCurrentUser(socket.id);
      if (user) {
        const message = formatMessage(user.username, msg);
        io.to(user.room).emit('message', message);
        messageHistory.addMessage(user.room, message);
      }
    });

    // Runs when client disconnects
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
      const user = userLeave(socket.id);

      if (user) {
        const leaveMessage = formatMessage(botName, `${user.username} left the server`);
        io.to(user.room).emit('message', leaveMessage);
        messageHistory.addMessage(user.room, leaveMessage);

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });

    // Handle reconnection
    socket.on('reconnect', () => {
      console.log(`User reconnected: ${socket.id}`);
      // Update user status to online
      const user = getCurrentUser(socket.id);
      if (user) {
        updateUserStatus(socket.id, 'online');
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });

    socket.on('updateStatus', (status) => {
      const user = updateUserStatus(socket.id, status);
      if (user) {
        io.to(user.room).emit('roomUsers', {
          room: user.room,
          users: getRoomUsers(user.room)
        });
      }
    });
  });

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Chatify server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
