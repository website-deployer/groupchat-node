const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000
});
window.socket = socket;

const urlParams = new URLSearchParams(window.location.search);
const username = (urlParams.get('name') || 'Guest').trim();
const room = (urlParams.get('room') || 'general').trim();
const MAX_MESSAGE_CHARS = 8000;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

let isConnected = false;
let reconnectAttempts = 0;
let isTabActive = true;
let notificationPermission = false;

const roomNameElement = document.getElementById('roomName');
if (roomNameElement) roomNameElement.textContent = room;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function showBanner(text, variant = 'warning') {
  let errorDiv = document.getElementById('connectionError');
  const inputArea = document.querySelector('.discord-input-area');
  const inputGroup = document.querySelector('.discord-input-group');

  if (!inputArea || !inputGroup) return;

  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'connectionError';
    inputArea.insertBefore(errorDiv, inputGroup);
  }

  errorDiv.className = `alert alert-${variant} alert-dismissible fade show m-2`;
  errorDiv.innerHTML = `
    <i class="bi bi-info-circle me-2"></i>${escapeHtml(text)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  setTimeout(() => {
    if (errorDiv && errorDiv.parentNode) errorDiv.remove();
  }, 4500);
}

function updateConnectionStatus(status) {
  let statusElement = document.getElementById('connectionStatus');
  if (!statusElement) {
    const container = document.querySelector('.discord-navbar .container-fluid');
    if (!container) return;
    statusElement = document.createElement('div');
    statusElement.id = 'connectionStatus';
    statusElement.className = 'connection-status';
    container.appendChild(statusElement);
  }

  statusElement.className = 'connection-status';
  if (status === 'connected') {
    statusElement.innerHTML = '<i class="bi bi-wifi"></i> Connected';
    statusElement.classList.add('text-success');
  } else if (status === 'disconnected') {
    statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Disconnected';
    statusElement.classList.add('text-warning');
  } else if (status === 'reconnecting') {
    statusElement.innerHTML = `<i class="bi bi-arrow-clockwise"></i> Reconnecting (${reconnectAttempts})`;
    statusElement.classList.add('text-info');
  } else {
    statusElement.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Connection issue';
    statusElement.classList.add('text-danger');
  }
}

function renderFileAttachment(file) {
  if (!file || !file.data) return '';

  const safeName = escapeHtml(file.name || 'attachment');
  const safeType = escapeHtml(file.type || 'application/octet-stream');
  const isImage = safeType.startsWith('image/');

  return `
    <div class="chat-file">
      <div class="chat-file-header">
        <i class="bi bi-paperclip"></i>
        <a href="${file.data}" download="${safeName}" target="_blank" rel="noopener noreferrer">${safeName}</a>
      </div>
      ${isImage ? `<img src="${file.data}" alt="${safeName}" class="chat-file-image">` : '<div class="chat-file-meta">Download attachment</div>'}
    </div>
  `;
}

function renderPoll(poll) {
  if (!poll || !Array.isArray(poll.options)) return '';

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  return `
    <div class="poll-card" data-poll-id="${escapeHtml(poll.id)}">
      <div class="poll-question">${escapeHtml(poll.question)}</div>
      <div class="poll-options">
        ${poll.options.map(option => {
          const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
          return `
            <button class="poll-option" data-option-index="${option.index}">
              <span>${escapeHtml(option.option)}</span>
              <span class="poll-option-votes">${option.votes} • ${percent}%</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="poll-total">${totalVotes} vote${totalVotes === 1 ? '' : 's'}</div>
    </div>
  `;
}

function outputMessage(message, shouldScroll = true) {
  if (!message || !message.username) return;

  const div = document.createElement('div');
  div.classList.add('discord-message');
  if (message.meta?.role === 'assistant') div.classList.add('assistant-message');
  if (message.meta?.role === 'system') div.classList.add('system-message');

  const initials = message.username.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  const safeText = escapeHtml(message.text || '').replace(/\n/g, '<br>');

  div.innerHTML = `
    <div class="discord-message-avatar">${initials || '??'}</div>
    <div class="discord-message-content">
      <div class="discord-message-header">
        <span class="discord-message-username">${escapeHtml(message.username)}</span>
        <span class="discord-message-time">${escapeHtml(message.time || new Date().toLocaleTimeString())}</span>
      </div>
      <div class="discord-message-text">${safeText}</div>
      ${message.type === 'file' ? renderFileAttachment(message.file) : ''}
      ${message.type === 'poll' ? renderPoll(message.poll) : ''}
    </div>
  `;

  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  chatMessages.appendChild(div);
  if (shouldScroll) scrollToBottom();
}

function updatePollMessage(poll) {
  const card = document.querySelector(`.poll-card[data-poll-id="${poll.id}"]`);
  if (!card) return;

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const options = card.querySelector('.poll-options');
  options.innerHTML = poll.options.map(option => {
    const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
    return `
      <button class="poll-option" data-option-index="${option.index}">
        <span>${escapeHtml(option.option)}</span>
        <span class="poll-option-votes">${option.votes} • ${percent}%</span>
      </button>
    `;
  }).join('');

  const totalEl = card.querySelector('.poll-total');
  totalEl.textContent = `${totalVotes} vote${totalVotes === 1 ? '' : 's'}`;
}

function outputUsers(users) {
  const participantsList = document.getElementById('participantsList');
  const mobileParticipantsList = document.getElementById('mobileParticipantsList');
  const memberCount = document.getElementById('memberCount');
  if (!participantsList || !Array.isArray(users)) return;

  const usersHTML = users.map(user => `
    <li class="list-group-item">
      <div class="d-flex align-items-center">
        <span class="status-indicator ${user.status || 'online'}"></span>
        <div class="discord-user-avatar me-2">${user.username ? user.username.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '??'}</div>
        <span class="discord-username">${escapeHtml(user.username || 'Unknown User')}</span>
      </div>
    </li>
  `).join('');

  participantsList.innerHTML = usersHTML;
  if (mobileParticipantsList) mobileParticipantsList.innerHTML = usersHTML;

  if (memberCount) {
    memberCount.textContent = users.length;
    memberCount.style.display = users.length ? 'block' : 'none';
  }
}

function sendMessage(messageInput) {
  const message = messageInput.value.slice(0, MAX_MESSAGE_CHARS).trim();
  if (!message) return;
  if (!isConnected) return showBanner('Connection lost. Message not sent.');

  socket.emit('chatMessage', message);
  messageInput.value = '';
  autoResizeTextarea(messageInput);
  socket.emit('stopTyping');
  document.dispatchEvent(new CustomEvent('chat:message-sent', { detail: { length: message.length } }));
}

function uploadFile(file) {
  if (!file) return;
  if (file.size > MAX_UPLOAD_SIZE) {
    showBanner('File exceeds 5MB limit.');
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    if (!isConnected) {
      showBanner('Connection lost. Upload not sent.');
      return;
    }

    socket.emit('fileUpload', {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      data: event.target.result
    });

    showBanner(`Uploaded ${file.name}`, 'success');
  };

  reader.onerror = () => showBanner('Failed to read file for upload.');
  reader.readAsDataURL(file);
}

socket.on('connect', () => {
  isConnected = true;
  reconnectAttempts = 0;
  updateConnectionStatus('connected');
  socket.emit('joinRoom', { username, room });
});
socket.on('disconnect', () => {
  isConnected = false;
  updateConnectionStatus('disconnected');
});
socket.on('reconnect_attempt', attemptNumber => {
  reconnectAttempts = attemptNumber;
  updateConnectionStatus('reconnecting');
});
socket.on('reconnect_error', () => updateConnectionStatus('error'));
socket.on('reconnect_failed', () => updateConnectionStatus('failed'));

window.addEventListener('online', () => updateConnectionStatus('reconnecting'));
window.addEventListener('offline', () => updateConnectionStatus('disconnected'));

socket.on('roomUsers', ({ users }) => outputUsers(users));
socket.on('messageHistory', history => {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  if (Array.isArray(history)) history.forEach(message => outputMessage(message, false));
  scrollToBottom();
});
socket.on('message', message => {
  outputMessage(message);
  if (!isTabActive && notificationPermission && message.username !== username) {
    new Notification('New Message', { body: `${message.username}: ${message.text}` });
  }
});
socket.on('pollUpdate', payload => updatePollMessage(payload.poll));
socket.on('uploadError', errorMessage => showBanner(errorMessage || 'Upload failed.'));
socket.on('pollError', errorMessage => showBanner(errorMessage || 'Poll action failed.'));

socket.on('typing', currentUsername => {
  const typingIndicator = document.getElementById('typingIndicator');
  if (!typingIndicator) return;
  typingIndicator.innerHTML = `<i class="bi bi-three-dots"></i> ${escapeHtml(currentUsername)} is typing...`;
  typingIndicator.style.display = 'block';
});
socket.on('stopTyping', () => {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) typingIndicator.style.display = 'none';
});

window.addEventListener('focus', () => {
  isTabActive = true;
  socket.emit('updateStatus', 'online');
});
window.addEventListener('blur', () => {
  isTabActive = false;
  socket.emit('updateStatus', 'offline');
});

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(permission => {
    notificationPermission = permission === 'granted';
  });
}

function createPollFlow() {
  const question = prompt('Poll question:');
  if (!question) return;
  const rawOptions = prompt('Poll options (comma-separated, at least 2):');
  if (!rawOptions) return;
  const options = rawOptions.split(',').map(text => text.trim()).filter(Boolean);
  socket.emit('createPoll', { question, options });
}

function askAssistantFlow() {
  const modeSelect = document.getElementById('assistantMode');
  const mode = modeSelect ? modeSelect.value : 'balanced';
  const promptText = prompt('Ask the assistant:');
  if (!promptText) return;
  socket.emit('assistantPrompt', { prompt: promptText, mode });
}

document.addEventListener('click', event => {
  const optionButton = event.target.closest('.poll-option');
  if (!optionButton) return;

  const card = optionButton.closest('.poll-card');
  if (!card) return;

  const pollId = card.dataset.pollId;
  const optionIndex = Number(optionButton.dataset.optionIndex);
  socket.emit('votePoll', { pollId, optionIndex });
});

document.addEventListener('DOMContentLoaded', () => {
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const leaveChatBtn = document.getElementById('leaveChat');
  const membersToggle = document.getElementById('membersToggle');
  const mobileMembersOverlay = document.getElementById('mobileMembersOverlay');
  const closeMembersOverlay = document.getElementById('closeMembersOverlay');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const quickAskBot = document.getElementById('quickAskBot');
  const quickCreatePoll = document.getElementById('quickCreatePoll');

  if (messageForm && messageInput) {
    messageForm.addEventListener('submit', event => {
      event.preventDefault();
      sendMessage(messageInput);
    });

    messageInput.addEventListener('input', () => {
      if (messageInput.value.length > MAX_MESSAGE_CHARS) {
        messageInput.value = messageInput.value.slice(0, MAX_MESSAGE_CHARS);
      }
      autoResizeTextarea(messageInput);
      socket.emit('typing');
    });

    messageInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(messageInput);
      }
    });

    messageInput.addEventListener('blur', () => socket.emit('stopTyping'));
  }

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', event => {
      uploadFile(event.target.files[0]);
      fileInput.value = '';
    });
  }

  if (quickAskBot) quickAskBot.addEventListener('click', askAssistantFlow);
  if (quickCreatePoll) quickCreatePoll.addEventListener('click', createPollFlow);

  if (leaveChatBtn) {
    leaveChatBtn.addEventListener('click', () => {
      window.location = '/';
    });
  }

  if (membersToggle && mobileMembersOverlay) {
    membersToggle.addEventListener('click', () => {
      mobileMembersOverlay.classList.add('show');
      const participantsList = document.getElementById('participantsList');
      const mobileParticipantsList = document.getElementById('mobileParticipantsList');
      if (participantsList && mobileParticipantsList) {
        mobileParticipantsList.innerHTML = participantsList.innerHTML;
      }
    });
  }

  if (closeMembersOverlay && mobileMembersOverlay) {
    closeMembersOverlay.addEventListener('click', () => mobileMembersOverlay.classList.remove('show'));
  }

  if (mobileMembersOverlay) {
    mobileMembersOverlay.addEventListener('click', event => {
      if (event.target === mobileMembersOverlay) mobileMembersOverlay.classList.remove('show');
    });
  }
});

requestNotificationPermission();
