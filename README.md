# Chatify - Next-Gen Communication Platform

A cutting-edge, modern group chat application built with Node.js, Socket.IO, and Bootstrap. Features a unique brand identity, animated transfer screens, advanced UI components, and powerful functional features for the ultimate communication experience.

## ✨ Features

### 🎨 Modern UI/UX
- **Unique Brand Identity**: Custom Chatify branding with animated gradients and effects
- **Animated Transfer Screen**: Smooth loading experience with particle effects and progress indicators
- **Advanced UI Components**: Enhanced chat interface with file uploads, emoji picker, and reactions
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Custom Typography**: Inter font family for a modern, clean look
- **Smooth Animations**: Fade-in, slide-in, bounce, and gradient shift effects throughout

### 💬 Enhanced Chat Features
- **Real-time Messaging**: Instant message delivery with Socket.IO
- **File Upload & Sharing**: Drag-and-drop file uploads with progress indicators
- **Advanced Emoji Picker**: Categorized emoji picker with recent emojis
- **Message Reactions**: React to messages with emojis and see reaction counts
- **@Mentions**: Mention users with @username autocomplete
- **Message Threading**: Start threaded conversations (context menu)
- **Voice Messages**: Voice recording capability (placeholder)
- **Message Search**: Search through chat history
- **Typing Indicators**: See when others are typing with smooth animations
- **Message History**: Navigate through previous messages with arrow keys
- **Auto-resize Input**: Message input automatically adjusts height
- **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + K` to focus message input
  - `Escape` to clear message input
  - `↑/↓` arrows to navigate message history

### 👥 User Management
- **User Avatars**: Auto-generated initials-based avatars
- **Status Indicators**: Online/offline status with colored indicators
- **Member List**: Real-time participant list with status updates
- **User Notifications**: Desktop notifications for new messages

### 🚀 Technical Features
- **Real-time Communication**: Powered by Socket.IO
- **Modern Backend**: Express.js server with clean architecture
- **Modular Design**: Separated concerns with utility modules
- **Error Handling**: Robust error handling and user feedback
- **Cross-platform**: Works on all modern browsers

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd group-chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
group-chat-app/
├── public/
│   ├── index.html          # Landing page
│   ├── styles.css          # Main stylesheet
│   ├── chat.js            # Chat functionality
│   └── chat-enhancements.js # Enhanced features
├── views/
│   └── chat.html          # Chat interface
├── utils/
│   ├── users.js           # User management
│   └── messages.js        # Message formatting
├── server.js              # Main server file
├── package.json           # Dependencies
└── README.md             # This file
```

## 🎯 Usage

### Joining a Chat
1. Enter your display name
2. Enter a server code (room name)
3. Click "Join Server"

### Chatting
- Type messages in the input field
- Use the emoji picker for reactions
- Navigate message history with arrow keys
- See who's online in the member list

### Keyboard Shortcuts
- `Ctrl/Cmd + K`: Focus message input
- `Escape`: Clear message input
- `↑`: Previous message in history
- `↓`: Next message in history

## 🎨 Customization

### Colors and Theme
The application uses CSS custom properties for easy theming. Main color variables are defined in `public/styles.css`:

```css
:root {
    --discord-bg: #36393f;
    --discord-accent: #5865f2;
    --discord-text: #dcddde;
    /* ... more variables */
}
```

### Adding Features
The modular design makes it easy to add new features:
- Chat features: `public/chat-enhancements.js`
- User management: `utils/users.js`
- Message handling: `utils/messages.js`

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for automatic server restarts.

### Adding New Features
1. Create new modules in appropriate directories
2. Update the main files to import new functionality
3. Add corresponding CSS for styling
4. Test thoroughly across different browsers

## 🌟 Key Improvements Made

1. **Complete UI Redesign**: Transformed from basic Bootstrap to Discord-like interface
2. **Enhanced User Experience**: Added animations, better typography, and smooth interactions
3. **Advanced Features**: Emoji picker, message history, keyboard shortcuts
4. **Better User Management**: Improved avatars, status indicators, and member display
5. **Responsive Design**: Optimized for all screen sizes
6. **Modern Styling**: CSS Grid, Flexbox, and custom properties for maintainable code

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by Discord's design language
- Built with Bootstrap 5 and Socket.IO
- Icons provided by Bootstrap Icons
- Fonts by Google Fonts (Inter)

---

**DiscordChat** - Where conversations come alive! 🚀
