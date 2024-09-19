const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('name');
const room = urlParams.get('room');

document.getElementById('roomName').textContent = room;

socket.emit('joinRoom', { username, room });

let isTabActive = true;
let notificationPermission = false;

socket.on('roomUsers', ({ room, users }) => {
    outputUsers(users);
});

socket.on('message', message => {
    outputMessage(message);
    
    if (!isTabActive && notificationPermission && message.username !== username) {
        new Notification('New Message', {
            body: `${message.username}: ${message.text}`,
            icon: '/path/to/your/icon.png'
        });
    }
    
    document.querySelector('#chatMessages').scrollTop = document.querySelector('#chatMessages').scrollHeight;
});

document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = e.target.elements.messageInput.value;
    socket.emit('chatMessage', msg);
    e.target.elements.messageInput.value = '';
    e.target.elements.messageInput.focus();
});

document.getElementById('leaveChat').addEventListener('click', () => {
    window.location = '/';
});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message', message.username === username ? 'message-own' : 'message-other');
    div.innerHTML = `
        <div class="message-header">
            <span class="message-username">${message.username}</span>
            <span class="message-time">${message.time}</span>
        </div>
        <div class="message-body">
            <p>${message.text}</p>
        </div>
    `;
    document.querySelector('#chatMessages').appendChild(div);

    const chatMessages = document.querySelector('#chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function outputUsers(users) {
    document.getElementById('participantsList').innerHTML = `
        ${users.map(user => `
            <li class="list-group-item">
                <span class="status-indicator ${user.status}"></span>
                <i class="bi bi-person-circle me-2"></i>
                ${user.username}
            </li>
        `).join('')}
    `;
}

const messageInput = document.getElementById('messageInput');
let typingTimer;

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

socket.on('typing', (username) => {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.textContent = `${username} is typing...`;
    typingIndicator.style.display = 'block';
});

socket.on('stopTyping', () => {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.style.display = 'none';
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
