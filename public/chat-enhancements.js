// Enhanced chat features
class ChatEnhancements {
    constructor() {
        this.emojiPicker = null;
        this.messageHistory = [];
        this.currentHistoryIndex = -1;
        this.init();
    }

    init() {
        this.setupEmojiPicker();
        this.setupMessageHistory();
        this.setupKeyboardShortcuts();
        this.setupMessageReactions();
        this.setupTypingIndicator();
    }

    setupEmojiPicker() {
        // Create emoji picker button
        const emojiButton = document.createElement('button');
        emojiButton.type = 'button';
        emojiButton.className = 'btn btn-outline-secondary me-2';
        emojiButton.innerHTML = '<i class="bi bi-emoji-smile"></i>';
        emojiButton.title = 'Add emoji';
        
        // Insert before send button
        const inputGroup = document.querySelector('.discord-input-group');
        const sendButton = document.querySelector('.discord-send-btn');
        inputGroup.insertBefore(emojiButton, sendButton);

        // Add click handler
        emojiButton.addEventListener('click', () => {
            this.toggleEmojiPicker();
        });
    }

    setupMessageHistory() {
        const messageInput = document.getElementById('messageInput');
        
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory('down');
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus message input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('messageInput').focus();
            }
            
            // Escape to clear message input
            if (e.key === 'Escape') {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = '';
                messageInput.style.height = 'auto';
            }
        });
    }

    setupMessageReactions() {
        // Add reaction functionality to messages
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('message-reaction')) {
                this.handleReaction(e.target);
            }
        });
    }

    setupTypingIndicator() {
        const messageInput = document.getElementById('messageInput');
        let typingTimeout;

        messageInput.addEventListener('input', () => {
            // Emit typing event
            if (window.socket) {
                window.socket.emit('typing');
            }

            // Clear previous timeout
            clearTimeout(typingTimeout);
            
            // Set new timeout to stop typing
            typingTimeout = setTimeout(() => {
                if (window.socket) {
                    window.socket.emit('stopTyping');
                }
            }, 1000);
        });
    }

    toggleEmojiPicker() {
        if (this.emojiPicker) {
            this.emojiPicker.remove();
            this.emojiPicker = null;
            return;
        }

        // Create emoji picker
        this.emojiPicker = document.createElement('div');
        this.emojiPicker.className = 'emoji-picker';
        this.emojiPicker.innerHTML = `
            <div class="emoji-picker-content">
                <div class="emoji-picker-header">
                    <h6>Choose an emoji</h6>
                    <button type="button" class="btn-close" onclick="this.closest('.emoji-picker').remove()"></button>
                </div>
                <div class="emoji-grid">
                    ${this.getEmojiGrid()}
                </div>
            </div>
        `;

        // Position the picker
        const inputGroup = document.querySelector('.discord-input-group');
        inputGroup.style.position = 'relative';
        inputGroup.appendChild(this.emojiPicker);

        // Add click handlers for emojis
        this.emojiPicker.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                this.insertEmoji(e.target.textContent);
                this.emojiPicker.remove();
                this.emojiPicker = null;
            }
        });
    }

    getEmojiGrid() {
        const emojis = [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
            '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
            '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
            '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
            '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
            '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
            '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
            '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
            '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
            '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
            '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
            '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
            '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
            '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
        ];

        return emojis.map(emoji => 
            `<span class="emoji-item" title="${emoji}">${emoji}</span>`
        ).join('');
    }

    insertEmoji(emoji) {
        const messageInput = document.getElementById('messageInput');
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        
        messageInput.value = text.substring(0, start) + emoji + text.substring(end);
        messageInput.focus();
        messageInput.setSelectionRange(start + emoji.length, start + emoji.length);
        
        // Trigger input event for auto-resize
        messageInput.dispatchEvent(new Event('input'));
    }

    navigateHistory(direction) {
        if (direction === 'up' && this.currentHistoryIndex < this.messageHistory.length - 1) {
            this.currentHistoryIndex++;
        } else if (direction === 'down' && this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
        } else if (direction === 'down' && this.currentHistoryIndex === 0) {
            this.currentHistoryIndex = -1;
            document.getElementById('messageInput').value = '';
            return;
        }

        if (this.currentHistoryIndex >= 0) {
            document.getElementById('messageInput').value = this.messageHistory[this.currentHistoryIndex];
        }
    }

    addToHistory(message) {
        if (message.trim() && message !== this.messageHistory[0]) {
            this.messageHistory.unshift(message);
            if (this.messageHistory.length > 50) {
                this.messageHistory.pop();
            }
        }
        this.currentHistoryIndex = -1;
    }

    handleReaction(reactionElement) {
        // Add reaction functionality
        console.log('Reaction clicked:', reactionElement.textContent);
    }

    // Add message with enhanced features
    addEnhancedMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'discord-message enhanced-message';
        
        // Add message ID for reactions
        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        messageElement.setAttribute('data-message-id', messageId);
        
        // Generate avatar initials
        const initials = message.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        messageElement.innerHTML = `
            <div class="discord-message-avatar">${initials}</div>
            <div class="discord-message-content">
                <div class="discord-message-header">
                    <span class="discord-message-username">${message.username}</span>
                    <span class="discord-message-time">${message.time}</span>
                </div>
                <div class="discord-message-text">${message.text}</div>
                <div class="message-reactions" data-message-id="${messageId}">
                    <!-- Reactions will be added here -->
                </div>
            </div>
        `;
        
        return messageElement;
    }
}

// Initialize enhancements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatEnhancements = new ChatEnhancements();
});

// Add CSS for emoji picker
const emojiPickerCSS = `
.emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--discord-bg-secondary);
    border: 1px solid var(--discord-border);
    border-radius: var(--discord-radius);
    box-shadow: var(--discord-shadow-lg);
    z-index: 1000;
    margin-bottom: 0.5rem;
}

.emoji-picker-content {
    padding: 1rem;
}

.emoji-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--discord-border);
}

.emoji-picker-header h6 {
    margin: 0;
    color: var(--discord-text);
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
}

.emoji-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;
    border-radius: var(--discord-radius);
    transition: var(--discord-transition);
    font-size: 1.2rem;
}

.emoji-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
}

.enhanced-message {
    position: relative;
}

.message-reactions {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.message-reaction {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--discord-border);
    border-radius: 12px;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: var(--discord-transition);
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.message-reaction:hover {
    background: rgba(255, 255, 255, 0.2);
}

.message-reaction.active {
    background: var(--discord-accent);
    color: white;
}
`;

// Add the CSS to the page
const style = document.createElement('style');
style.textContent = emojiPickerCSS;
document.head.appendChild(style);
