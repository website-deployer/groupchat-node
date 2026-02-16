const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { userJoin, getCurrentUser, userLeave, getRoomUsers, updateUserStatus } = require('./utils/users');
const formatMessage = require('./utils/messages');
const MessageHistory = require('./utils/messageHistory');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  maxHttpBufferSize: 6 * 1024 * 1024
});

const port = process.env.PORT || 3000;
const botName = 'Chatify Assistant';
const MAX_MESSAGE_LENGTH = 8000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const messageHistory = new MessageHistory();
const roomPolls = new Map(); // room -> Map(pollId => poll)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('views'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('./package.json').version
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/join', (req, res) => {
  const name = (req.body.name || '').trim();
  const roomCode = (req.body.roomCode || '').trim();

  if (name && roomCode) {
    res.redirect(`/transfer-screen.html?redirect=${encodeURIComponent(`/chat.html?name=${encodeURIComponent(name)}&room=${encodeURIComponent(roomCode)}`)}`);
    return;
  }

  res.redirect('/?error=invalid');
});

function sanitizeText(value) {
  return value
    .toString()
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .slice(0, MAX_MESSAGE_LENGTH)
    .trim();
}

function sendRoomUsers(room) {
  io.to(room).emit('roomUsers', {
    room,
    users: getRoomUsers(room)
  });
}

function getBotReply(prompt, mode) {
  const normalized = prompt.toLowerCase();
  const style = mode || 'balanced';

  if (normalized.includes('help')) {
    return `I can help with summarizing ideas, drafting replies, and creating decisions. Try /poll, send a file, or ask me to summarize the room conversation. (mode: ${style})`;
  }

  if (normalized.includes('summary') || normalized.includes('summarize')) {
    return `Quick summary: people are collaborating in real time, attachments are enabled, and polls can be created from the composer tools. Want a tighter action list?`;
  }

  if (normalized.includes('roadmap') || normalized.includes('plan')) {
    return `Suggested plan:\n1) Define goals\n2) Create a poll for team alignment\n3) Share files\n4) Assign owners\n5) Track updates in-thread.`;
  }

  return `Great point. If you'd like, I can turn that into a concise action list, a polished response, or a decision poll for the room.`;
}

function ensureRoomPolls(room) {
  if (!roomPolls.has(room)) {
    roomPolls.set(room, new Map());
  }
  return roomPolls.get(room);
}

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('joinRoom', ({ username, room }) => {
    const safeUsername = sanitizeText(username || 'Guest').slice(0, 30);
    const safeRoom = sanitizeText(room || 'general').slice(0, 40);

    const user = userJoin(socket.id, safeUsername || 'Guest', safeRoom || 'general');
    socket.join(user.room);

    const history = messageHistory.getMessages(user.room, 120);
    socket.emit('messageHistory', history);

    const welcomeMessage = {
      ...formatMessage(botName, `Welcome to ${user.room}, ${user.username}. You can share files, create polls, and use the assistant tools from the top action bar.`),
      type: 'text',
      meta: { role: 'assistant' }
    };
    socket.emit('message', welcomeMessage);

    const joinMessage = {
      ...formatMessage(botName, `${user.username} joined the room`),
      type: 'text',
      meta: { role: 'system' }
    };
    socket.broadcast.to(user.room).emit('message', joinMessage);
    messageHistory.addMessage(user.room, joinMessage);

    sendRoomUsers(user.room);
  });

  socket.on('chatMessage', rawMessage => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    const cleanedText = sanitizeText(rawMessage);
    if (!cleanedText) return;

    const message = {
      ...formatMessage(user.username, cleanedText),
      type: 'text'
    };

    io.to(user.room).emit('message', message);
    messageHistory.addMessage(user.room, message);

    if (cleanedText.startsWith('/ai ')) {
      const prompt = cleanedText.slice(4).trim();
      const botMessage = {
        ...formatMessage(botName, getBotReply(prompt, 'balanced')),
        type: 'text',
        meta: { role: 'assistant', replyTo: cleanedText }
      };
      io.to(user.room).emit('message', botMessage);
      messageHistory.addMessage(user.room, botMessage);
    }
  });

  socket.on('assistantPrompt', payload => {
    const user = getCurrentUser(socket.id);
    if (!user || !payload) return;

    const prompt = sanitizeText(payload.prompt || '');
    const mode = sanitizeText(payload.mode || 'balanced').slice(0, 20);
    if (!prompt) return;

    const botMessage = {
      ...formatMessage(botName, getBotReply(prompt, mode)),
      type: 'text',
      meta: { role: 'assistant', mode }
    };

    io.to(user.room).emit('message', botMessage);
    messageHistory.addMessage(user.room, botMessage);
  });

  socket.on('createPoll', payload => {
    const user = getCurrentUser(socket.id);
    if (!user || !payload) return;

    const question = sanitizeText(payload.question || '').slice(0, 240);
    const options = Array.isArray(payload.options)
      ? payload.options.map(option => sanitizeText(option).slice(0, 90)).filter(Boolean).slice(0, 6)
      : [];

    if (!question || options.length < 2) {
      socket.emit('pollError', 'A poll needs a question and at least 2 options.');
      return;
    }

    const pollId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const poll = {
      id: pollId,
      room: user.room,
      createdBy: user.username,
      question,
      options: options.map((option, index) => ({ index, option, votes: 0 })),
      voters: {}
    };

    const roomPollMap = ensureRoomPolls(user.room);
    roomPollMap.set(pollId, poll);

    const pollMessage = {
      ...formatMessage(user.username, `Poll: ${question}`),
      type: 'poll',
      poll
    };

    io.to(user.room).emit('message', pollMessage);
    messageHistory.addMessage(user.room, pollMessage);
  });

  socket.on('votePoll', payload => {
    const user = getCurrentUser(socket.id);
    if (!user || !payload) return;

    const pollId = sanitizeText(payload.pollId || '').slice(0, 60);
    const optionIndex = Number(payload.optionIndex);
    const roomPollMap = ensureRoomPolls(user.room);
    const poll = roomPollMap.get(pollId);

    if (!poll || Number.isNaN(optionIndex) || !poll.options[optionIndex]) {
      socket.emit('pollError', 'Poll vote was invalid.');
      return;
    }

    const previousVote = poll.voters[socket.id];
    if (previousVote !== undefined && poll.options[previousVote]) {
      poll.options[previousVote].votes = Math.max(0, poll.options[previousVote].votes - 1);
    }

    poll.voters[socket.id] = optionIndex;
    poll.options[optionIndex].votes += 1;

    const pollMessage = {
      ...formatMessage(botName, `${user.username} voted on: ${poll.question}`),
      type: 'poll-update',
      poll
    };

    io.to(user.room).emit('pollUpdate', pollMessage);
  });

  socket.on('fileUpload', payload => {
    const user = getCurrentUser(socket.id);
    if (!user || !payload) return;

    const name = sanitizeText(payload.name || 'attachment').slice(0, 120);
    const type = sanitizeText(payload.type || 'application/octet-stream').slice(0, 100);
    const size = Number(payload.size) || 0;
    const data = typeof payload.data === 'string' ? payload.data : '';

    if (!name || !data.startsWith('data:') || data.length < 30) {
      socket.emit('uploadError', 'Invalid file payload.');
      return;
    }

    if (size > MAX_FILE_SIZE) {
      socket.emit('uploadError', `File is too large. Max size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB.`);
      return;
    }

    const fileMessage = {
      ...formatMessage(user.username, `${user.username} shared a file: ${name}`),
      type: 'file',
      file: { name, type, size, data }
    };

    io.to(user.room).emit('message', fileMessage);
    messageHistory.addMessage(user.room, fileMessage);
  });

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

  socket.on('updateStatus', status => {
    const user = updateUserStatus(socket.id, status);
    if (user) sendRoomUsers(user.room);
  });

  socket.on('disconnect', reason => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    const user = userLeave(socket.id);
    if (!user) return;

    const leaveMessage = {
      ...formatMessage(botName, `${user.username} left the room`),
      type: 'text',
      meta: { role: 'system' }
    };

    io.to(user.room).emit('message', leaveMessage);
    messageHistory.addMessage(user.room, leaveMessage);
    sendRoomUsers(user.room);
  });
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

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

server.listen(port, () => {
  console.log(`Chatify server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
