const moment = require('moment');

class MessageHistory {
    constructor() {
        this.messages = new Map(); // room -> messages array
        this.cleanupInterval = null;
        this.startCleanup();
    }

    addMessage(room, message) {
        if (!this.messages.has(room)) {
            this.messages.set(room, []);
        }
        
        const messageWithTimestamp = {
            ...message,
            timestamp: moment().valueOf(),
            id: this.generateMessageId()
        };
        
        this.messages.get(room).push(messageWithTimestamp);
        
        // Keep only last 1000 messages per room to prevent memory issues
        if (this.messages.get(room).length > 1000) {
            this.messages.get(room).shift();
        }
    }

    getMessages(room, limit = 50) {
        if (!this.messages.has(room)) {
            return [];
        }
        
        const roomMessages = this.messages.get(room);
        return roomMessages.slice(-limit);
    }

    getRecentMessages(room, since) {
        if (!this.messages.has(room)) {
            return [];
        }
        
        const roomMessages = this.messages.get(room);
        return roomMessages.filter(msg => msg.timestamp > since);
    }

    generateMessageId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Clean up messages older than 1 day
    cleanup() {
        const oneDayAgo = moment().subtract(1, 'day').valueOf();
        
        for (const [room, messages] of this.messages.entries()) {
            const recentMessages = messages.filter(msg => msg.timestamp > oneDayAgo);
            
            if (recentMessages.length === 0) {
                // If no recent messages, check if room has been inactive for more than 1 day
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.timestamp < oneDayAgo) {
                    this.messages.delete(room);
                    console.log(`Deleted inactive room: ${room}`);
                }
            } else {
                this.messages.set(room, recentMessages);
            }
        }
    }

    startCleanup() {
        // Run cleanup every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
    }

    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }

    // Get room activity status
    isRoomActive(room) {
        if (!this.messages.has(room)) {
            return false;
        }
        
        const messages = this.messages.get(room);
        if (messages.length === 0) {
            return false;
        }
        
        const lastMessage = messages[messages.length - 1];
        const oneDayAgo = moment().subtract(1, 'day').valueOf();
        
        return lastMessage.timestamp > oneDayAgo;
    }

    // Get room statistics
    getRoomStats(room) {
        if (!this.messages.has(room)) {
            return {
                messageCount: 0,
                lastActivity: null,
                isActive: false
            };
        }
        
        const messages = this.messages.get(room);
        const lastMessage = messages[messages.length - 1];
        
        return {
            messageCount: messages.length,
            lastActivity: lastMessage ? moment(lastMessage.timestamp).format('YYYY-MM-DD HH:mm:ss') : null,
            isActive: this.isRoomActive(room)
        };
    }
}

module.exports = MessageHistory;
