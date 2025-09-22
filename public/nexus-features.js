// NexusChat Enhanced Features
class NexusFeatures {
    constructor() {
        this.emojiPicker = null;
        this.filePreview = null;
        this.messageReactions = new Map();
        this.mentions = new Set();
        this.init();
    }

    init() {
        this.setupFileUpload();
        this.setupEmojiPicker();
        this.setupMessageReactions();
        this.setupMentions();
        this.setupMessageSearch();
        this.setupVoiceMessages();
        this.setupMessageThreading();
    }

    setupFileUpload() {
        const attachBtn = document.getElementById('attachBtn');
        const fileInput = document.getElementById('fileInput');
        
        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
            });
        }
    }

    handleFileUpload(file) {
        // Create file preview
        const filePreview = this.createFilePreview(file);
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.appendChild(filePreview);

        // Simulate upload progress
        this.simulateUploadProgress(filePreview, file);

        // Scroll to bottom
        this.scrollToBottom();
    }

    createFilePreview(file) {
        const preview = document.createElement('div');
        preview.className = 'file-preview nexus-message';
        
        const fileIcon = this.getFileIcon(file.type);
        const fileSize = this.formatFileSize(file.size);
        
        preview.innerHTML = `
            <div class="discord-message-avatar">
                <i class="bi bi-person-circle"></i>
            </div>
            <div class="discord-message-content">
                <div class="discord-message-header">
                    <span class="discord-message-username">You</span>
                    <span class="discord-message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="file-upload-container">
                    <div class="file-info">
                        <div class="file-icon">${fileIcon}</div>
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${fileSize}</div>
                        </div>
                    </div>
                    <div class="upload-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="upload-status">Uploading...</div>
                    </div>
                </div>
            </div>
        `;

        return preview;
    }

    getFileIcon(type) {
        if (type.startsWith('image/')) return '<i class="bi bi-image"></i>';
        if (type.includes('pdf')) return '<i class="bi bi-file-pdf"></i>';
        if (type.includes('word') || type.includes('document')) return '<i class="bi bi-file-word"></i>';
        if (type.includes('text')) return '<i class="bi bi-file-text"></i>';
        return '<i class="bi bi-file"></i>';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    simulateUploadProgress(preview, file) {
        const progressFill = preview.querySelector('.progress-fill');
        const uploadStatus = preview.querySelector('.upload-status');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                uploadStatus.textContent = 'Upload complete!';
                progressFill.style.background = 'var(--discord-success)';
            }
            progressFill.style.width = progress + '%';
        }, 200);
    }

    setupEmojiPicker() {
        const emojiBtn = document.getElementById('emojiBtn');
        
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                this.toggleEmojiPicker();
            });
        }
    }

    toggleEmojiPicker() {
        if (this.emojiPicker) {
            this.emojiPicker.remove();
            this.emojiPicker = null;
            return;
        }

        this.emojiPicker = document.createElement('div');
        this.emojiPicker.className = 'nexus-emoji-picker';
        this.emojiPicker.innerHTML = `
            <div class="emoji-picker-content">
                <div class="emoji-picker-header">
                    <h6>Choose an emoji</h6>
                    <button type="button" class="btn-close" onclick="this.closest('.nexus-emoji-picker').remove()"></button>
                </div>
                <div class="emoji-categories">
                    <button class="emoji-category active" data-category="recent">Recent</button>
                    <button class="emoji-category" data-category="smileys">😀</button>
                    <button class="emoji-category" data-category="people">👥</button>
                    <button class="emoji-category" data-category="objects">🎉</button>
                </div>
                <div class="emoji-grid" id="emojiGrid">
                    ${this.getEmojiGrid('recent')}
                </div>
            </div>
        `;

        const inputGroup = document.querySelector('.discord-input-group');
        inputGroup.style.position = 'relative';
        inputGroup.appendChild(this.emojiPicker);

        // Add category switching
        this.emojiPicker.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-category')) {
                const category = e.target.dataset.category;
                this.switchEmojiCategory(category);
            } else if (e.target.classList.contains('emoji-item')) {
                this.insertEmoji(e.target.textContent);
                this.emojiPicker.remove();
                this.emojiPicker = null;
            }
        });
    }

    switchEmojiCategory(category) {
        const categories = this.emojiPicker.querySelectorAll('.emoji-category');
        categories.forEach(cat => cat.classList.remove('active'));
        this.emojiPicker.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        const emojiGrid = this.emojiPicker.querySelector('#emojiGrid');
        emojiGrid.innerHTML = this.getEmojiGrid(category);
    }

    getEmojiGrid(category) {
        const emojiCategories = {
            recent: ['😀', '😂', '❤️', '👍', '👎', '🎉', '🔥', '💯'],
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰'],
            people: ['👤', '👥', '👨', '👩', '👦', '👧', '👶', '👴', '👵', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓'],
            objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⭐', '🌟', '💫', '✨', '🔥', '💯']
        };

        const emojis = emojiCategories[category] || emojiCategories.smileys;
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
        
        messageInput.dispatchEvent(new Event('input'));
    }

    setupMessageReactions() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('message-reaction')) {
                this.handleReaction(e.target);
            }
        });
    }

    handleReaction(reactionElement) {
        const messageId = reactionElement.closest('.discord-message').dataset.messageId;
        const emoji = reactionElement.textContent;
        
        if (!this.messageReactions.has(messageId)) {
            this.messageReactions.set(messageId, new Map());
        }
        
        const reactions = this.messageReactions.get(messageId);
        const currentCount = reactions.get(emoji) || 0;
        reactions.set(emoji, currentCount + 1);
        
        this.updateReactionDisplay(reactionElement, currentCount + 1);
    }

    updateReactionDisplay(reactionElement, count) {
        const countSpan = reactionElement.querySelector('.reaction-count');
        if (countSpan) {
            countSpan.textContent = count;
        } else {
            reactionElement.innerHTML = `${reactionElement.textContent} <span class="reaction-count">${count}</span>`;
        }
        reactionElement.classList.add('active');
    }

    setupMentions() {
        const messageInput = document.getElementById('messageInput');
        
        messageInput.addEventListener('input', (e) => {
            const text = e.target.value;
            const cursorPos = e.target.selectionStart;
            
            // Check for @ mention
            const beforeCursor = text.substring(0, cursorPos);
            const mentionMatch = beforeCursor.match(/@(\w*)$/);
            
            if (mentionMatch) {
                this.showMentionSuggestions(mentionMatch[1]);
            } else {
                this.hideMentionSuggestions();
            }
        });
    }

    showMentionSuggestions(query) {
        // Get current users from the participants list
        const participants = Array.from(document.querySelectorAll('#participantsList .discord-username'))
            .map(el => el.textContent)
            .filter(name => name.toLowerCase().includes(query.toLowerCase()));
        
        if (participants.length === 0) return;
        
        let mentionBox = document.getElementById('mentionSuggestions');
        if (!mentionBox) {
            mentionBox = document.createElement('div');
            mentionBox.id = 'mentionSuggestions';
            mentionBox.className = 'mention-suggestions';
            document.querySelector('.discord-input-area').appendChild(mentionBox);
        }
        
        mentionBox.innerHTML = participants.map(name => 
            `<div class="mention-item" data-name="${name}">@${name}</div>`
        ).join('');
        
        mentionBox.style.display = 'block';
        
        // Add click handlers
        mentionBox.addEventListener('click', (e) => {
            if (e.target.classList.contains('mention-item')) {
                this.insertMention(e.target.dataset.name);
            }
        });
    }

    insertMention(name) {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value;
        const cursorPos = messageInput.selectionStart;
        
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        
        const newText = beforeCursor.replace(/@\w*$/, `@${name} `) + afterCursor;
        messageInput.value = newText;
        messageInput.focus();
        
        this.hideMentionSuggestions();
    }

    hideMentionSuggestions() {
        const mentionBox = document.getElementById('mentionSuggestions');
        if (mentionBox) {
            mentionBox.style.display = 'none';
        }
    }

    setupMessageSearch() {
        // Add search functionality
        const searchHTML = `
            <div class="message-search-container">
                <div class="search-input-group">
                    <input type="text" id="messageSearch" placeholder="Search messages..." class="form-control">
                    <button class="btn btn-outline-secondary" id="searchBtn">
                        <i class="bi bi-search"></i>
                    </button>
                </div>
                <div class="search-results" id="searchResults"></div>
            </div>
        `;
        
        // Add search to sidebar
        const sidebar = document.querySelector('.discord-sidebar .card-body');
        if (sidebar) {
            sidebar.insertAdjacentHTML('afterbegin', searchHTML);
        }
    }

    setupVoiceMessages() {
        // Add voice message functionality
        const voiceBtn = document.createElement('button');
        voiceBtn.className = 'btn btn-outline-secondary me-2';
        voiceBtn.innerHTML = '<i class="bi bi-mic"></i>';
        voiceBtn.title = 'Voice message';
        
        const inputGroup = document.querySelector('.discord-input-group');
        inputGroup.insertBefore(voiceBtn, inputGroup.querySelector('#emojiBtn'));
        
        voiceBtn.addEventListener('click', () => {
            this.toggleVoiceRecording();
        });
    }

    toggleVoiceRecording() {
        // Placeholder for voice recording functionality
        console.log('Voice recording toggle - would implement WebRTC here');
    }

    setupMessageThreading() {
        // Add threading functionality
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.discord-message')) {
                e.preventDefault();
                this.showMessageContextMenu(e);
            }
        });
    }

    showMessageContextMenu(e) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'message-context-menu';
        contextMenu.innerHTML = `
            <div class="context-item" data-action="reply">
                <i class="bi bi-reply"></i> Reply
            </div>
            <div class="context-item" data-action="react">
                <i class="bi bi-emoji-smile"></i> React
            </div>
            <div class="context-item" data-action="thread">
                <i class="bi bi-chat-square"></i> Start Thread
            </div>
        `;
        
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.style.zIndex = '1000';
        
        document.body.appendChild(contextMenu);
        
        // Remove on click outside
        setTimeout(() => {
            document.addEventListener('click', () => {
                contextMenu.remove();
            }, { once: true });
        }, 0);
    }

    scrollToBottom() {
        const chatMessages = document.querySelector('#chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nexusFeatures = new NexusFeatures();
});

// Add enhanced CSS
const enhancedCSS = `
.nexus-emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--discord-bg-secondary);
    border: 1px solid var(--discord-border);
    border-radius: var(--discord-radius-lg);
    box-shadow: var(--discord-shadow-lg);
    z-index: 1000;
    margin-bottom: 0.5rem;
    max-width: 400px;
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

.emoji-categories {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.emoji-category {
    background: transparent;
    border: 1px solid var(--discord-border);
    border-radius: var(--discord-radius);
    padding: 0.5rem;
    color: var(--discord-text-secondary);
    cursor: pointer;
    transition: var(--discord-transition);
}

.emoji-category.active,
.emoji-category:hover {
    background: var(--discord-accent);
    color: white;
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

.file-preview {
    margin-bottom: 1rem;
    animation: slideInUp 0.3s ease;
}

.file-upload-container {
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--discord-radius);
    padding: 1rem;
    margin-top: 0.5rem;
}

.file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.file-icon {
    font-size: 2rem;
    color: var(--discord-accent);
}

.file-details {
    flex: 1;
}

.file-name {
    font-weight: 600;
    color: var(--discord-text);
}

.file-size {
    font-size: 0.8rem;
    color: var(--discord-text-secondary);
}

.upload-progress {
    margin-top: 0.5rem;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: var(--discord-accent);
    border-radius: 2px;
    transition: width 0.3s ease;
}

.upload-status {
    font-size: 0.8rem;
    color: var(--discord-text-secondary);
}

.mention-suggestions {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--discord-bg-secondary);
    border: 1px solid var(--discord-border);
    border-radius: var(--discord-radius);
    box-shadow: var(--discord-shadow);
    z-index: 1000;
    margin-bottom: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
}

.mention-item {
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: var(--discord-transition);
    color: var(--discord-text);
}

.mention-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.message-context-menu {
    background: var(--discord-bg-secondary);
    border: 1px solid var(--discord-border);
    border-radius: var(--discord-radius);
    box-shadow: var(--discord-shadow-lg);
    padding: 0.5rem 0;
    min-width: 150px;
}

.context-item {
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: var(--discord-transition);
    color: var(--discord-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.context-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// Add the enhanced CSS
const style = document.createElement('style');
style.textContent = enhancedCSS;
document.head.appendChild(style);
