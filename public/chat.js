const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
});

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('name');
const room = urlParams.get('room');

// Ensure elements exist before accessing them
const roomNameElement = document.getElementById('roomName');
if (roomNameElement) {
    roomNameElement.textContent = room;
}

// Connection status indicators
let isConnected = false;
let reconnectAttempts = 0;

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server');
  isConnected = true;
  reconnectAttempts = 0;
  updateConnectionStatus('connected');
  socket.emit('joinRoom', { username, room });
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
  isConnected = false;
  updateConnectionStatus('disconnected');
});

socket.on('reconnect', () => {
  console.log('Reconnected to server');
  isConnected = true;
  updateConnectionStatus('connected');
  socket.emit('joinRoom', { username, room });
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
  reconnectAttempts = attemptNumber;
  updateConnectionStatus('reconnecting');
});

socket.on('reconnect_error', (error) => {
  console.log('Reconnection error:', error);
  updateConnectionStatus('error');
});

socket.on('reconnect_failed', () => {
  console.log('Reconnection failed');
  updateConnectionStatus('failed');
});

// Network status detection
window.addEventListener('online', () => {
  console.log('Network connection restored');
  updateConnectionStatus('reconnecting');
});

window.addEventListener('offline', () => {
  console.log('Network connection lost');
  updateConnectionStatus('disconnected');
});

// Update connection status UI
function updateConnectionStatus(status) {
  console.log('Updating connection status to:', status);
  
  let statusElement = document.getElementById('connectionStatus');
  if (!statusElement) {
    const container = document.querySelector('.discord-navbar .container-fluid');
    if (!container) {
      console.error('Navbar container not found');
      return;
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connectionStatus';
    statusDiv.className = 'connection-status';
    container.appendChild(statusDiv);
    statusElement = statusDiv;
    console.log('Created connection status element');
  }
  
  // Clear any existing classes
  statusElement.className = 'connection-status';
  
  switch (status) {
    case 'connected':
      statusElement.innerHTML = '<i class="bi bi-wifi"></i> Connected';
      statusElement.classList.add('text-success');
      break;
    case 'disconnected':
      statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Disconnected';
      statusElement.classList.add('text-warning');
      break;
    case 'reconnecting':
      statusElement.innerHTML = `<i class="bi bi-arrow-clockwise"></i> Reconnecting... (${reconnectAttempts})`;
      statusElement.classList.add('text-info');
      break;
    case 'error':
      statusElement.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Connection Error';
      statusElement.classList.add('text-danger');
      break;
    case 'failed':
      statusElement.innerHTML = '<i class="bi bi-x-circle"></i> Connection Failed';
      statusElement.classList.add('text-danger');
      break;
    default:
      console.warn('Unknown connection status:', status);
  }
  
  // Force a reflow to ensure the change is visible
  statusElement.offsetHeight;
}

let isTabActive = true;
let notificationPermission = false;

socket.on('roomUsers', ({ room, users }) => {
    outputUsers(users);
});

// Handle message history
socket.on('messageHistory', (history) => {
    console.log('Received message history:', history.length, 'messages');
    const chatMessages = document.querySelector('#chatMessages');
    
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    // Clear existing messages
    chatMessages.innerHTML = '';
    
    // Add historical messages
    if (Array.isArray(history)) {
        history.forEach(message => {
            outputMessage(message, false); // false = don't scroll to bottom
        });
    }
    
    // Scroll to bottom after loading history
    scrollToBottom();
});

socket.on('message', message => {
    outputMessage(message);
    
    if (!isTabActive && notificationPermission && message.username !== username) {
        new Notification('New Message', {
            body: `${message.username}: ${message.text}`,
            icon: '/path/to/your/icon.png'
        });
    }
});

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function outputMessage(message, shouldScroll = true) {
    if (!message || !message.username || !message.text) {
        console.error('Invalid message object:', message);
        return;
    }
    
    const div = document.createElement('div');
    div.classList.add('discord-message');
    
    // Generate avatar initials safely
    const initials = message.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    div.innerHTML = `
        <div class="discord-message-avatar">${initials}</div>
        <div class="discord-message-content">
            <div class="discord-message-header">
                <span class="discord-message-username">${message.username}</span>
                <span class="discord-message-time">${message.time || new Date().toLocaleTimeString()}</span>
            </div>
            <div class="discord-message-text">${message.text}</div>
        </div>
    `;
    
    const chatMessages = document.querySelector('#chatMessages');
    if (chatMessages) {
        chatMessages.appendChild(div);
        
        if (shouldScroll) {
            scrollToBottom();
        }
    } else {
        console.error('Chat messages container not found');
    }
}

function outputUsers(users) {
    const participantsList = document.getElementById('participantsList');
    const mobileParticipantsList = document.getElementById('mobileParticipantsList');
    const memberCount = document.getElementById('memberCount');
    
    if (!participantsList) {
        console.error('Participants list container not found');
        return;
    }
    
    if (!Array.isArray(users)) {
        console.error('Invalid users array:', users);
        return;
    }
    
    const usersHTML = `
        ${users.map(user => `
            <li class="list-group-item">
                <div class="d-flex align-items-center">
                    <span class="status-indicator ${user.status || 'online'}"></span>
                    <div class="discord-user-avatar me-2">
                        ${user.username ? user.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                    </div>
                    <span class="discord-username">${user.username || 'Unknown User'}</span>
                </div>
            </li>
        `).join('')}
    `;
    
    participantsList.innerHTML = usersHTML;
    
    // Update mobile participants list if it exists
    if (mobileParticipantsList) {
        mobileParticipantsList.innerHTML = usersHTML;
    }
    
    // Update member count badge
    if (memberCount) {
        if (users.length > 0) {
            memberCount.textContent = users.length;
            memberCount.style.display = 'block';
        } else {
            memberCount.style.display = 'none';
        }
    }
}

function scrollToBottom() {
    const chatMessages = document.querySelector('#chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function showConnectionError() {
    // Create or update error message
    let errorDiv = document.getElementById('connectionError');
    if (!errorDiv) {
        const inputArea = document.querySelector('.discord-input-area');
        const inputGroup = document.querySelector('.discord-input-group');
        
        if (!inputArea || !inputGroup) {
            console.error('Input area or input group not found');
            return;
        }
        
        errorDiv = document.createElement('div');
        errorDiv.id = 'connectionError';
        errorDiv.className = 'alert alert-warning alert-dismissible fade show';
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>Connection Lost!</strong> Please check your internet connection and try again.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        inputArea.insertBefore(errorDiv, inputGroup);
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Wait for DOM to be ready before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = e.target.elements.messageInput.value.trim();
            if (msg && isConnected) {
                socket.emit('chatMessage', msg);
                
                // Add to message history
                if (window.chatEnhancements) {
                    window.chatEnhancements.addToHistory(msg);
                }
                
                e.target.elements.messageInput.value = '';
                autoResizeTextarea(e.target.elements.messageInput);
            } else if (!isConnected) {
                // Show connection error
                showConnectionError();
            }
        });
    }

    // Add auto-resize functionality
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            autoResizeTextarea(messageInput);
        });
    }

    // Leave chat button
    const leaveChatBtn = document.getElementById('leaveChat');
    if (leaveChatBtn) {
        leaveChatBtn.addEventListener('click', () => {
            window.location = '/';
        });
    }

    // Mobile members toggle
    const membersToggle = document.getElementById('membersToggle');
    const mobileMembersOverlay = document.getElementById('mobileMembersOverlay');
    const closeMembersOverlay = document.getElementById('closeMembersOverlay');
    
    if (membersToggle && mobileMembersOverlay) {
        membersToggle.addEventListener('click', () => {
            mobileMembersOverlay.classList.add('show');
            // Copy members to mobile list
            const participantsList = document.getElementById('participantsList');
            const mobileParticipantsList = document.getElementById('mobileParticipantsList');
            if (participantsList && mobileParticipantsList) {
                mobileParticipantsList.innerHTML = participantsList.innerHTML;
            }
        });
    }
    
    if (closeMembersOverlay && mobileMembersOverlay) {
        closeMembersOverlay.addEventListener('click', () => {
            mobileMembersOverlay.classList.remove('show');
        });
    }
    
    // Close overlay when clicking outside
    if (mobileMembersOverlay) {
        mobileMembersOverlay.addEventListener('click', (e) => {
            if (e.target === mobileMembersOverlay) {
                mobileMembersOverlay.classList.remove('show');
            }
        });
    }

    // Typing indicators
    let typingTimer;
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            clearTimeout(typingTimer);
            socket.emit('typing');
            
            typingTimer = setTimeout(() => {
                socket.emit('stopTyping');
            }, 1000);
        });

        messageInput.addEventListener('blur', () => {
            clearTimeout(typingTimer);
            socket.emit('stopTyping');
        });
    }
});

socket.on('typing', (username) => {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.innerHTML = `<i class="bi bi-three-dots"></i> ${username} is typing...`;
        typingIndicator.style.display = 'block';
    }
});

socket.on('stopTyping', () => {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
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
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
    } else {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                notificationPermission = true;
            }
        });
    }
}

requestNotificationPermission();