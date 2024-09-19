const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { userJoin, getCurrentUser, userLeave, getRoomUsers, updateUserStatus } = require('./utils/users');
const formatMessage = require('./utils/messages');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const botName = 'ChatBot';

// Middleware to parse JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve static files from the 'views' directory
app.use(express.static('views'));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle chat room join
app.post('/join', (req, res) => {
  const { name, roomCode } = req.body;
  
  if (name && roomCode) {
    res.redirect(`/chat.html?name=${encodeURIComponent(name)}&room=${encodeURIComponent(roomCode)}`);
  } else {
    res.redirect('/?error=invalid');
  }
});
  // Run when client connects
  io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
      const user = userJoin(socket.id, username, room);

      socket.join(user.room);

      // Welcome current user
      socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

      // Broadcast when a user connects
      socket.broadcast
        .to(user.room)
        .emit(
          'message',
          formatMessage(botName, `${user.username} has joined the chat`)
        );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });

      // Typing ...
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

      io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
      const user = userLeave(socket.id);

      if (user) {
        io.to(user.room).emit(
          'message',
          formatMessage(botName, `${user.username} has left the chat`)
        );

        // Send users and room info
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

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
