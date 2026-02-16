class NexusFeatures {
  constructor() {
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.setupComposerTools();
    this.setupSearch();
    this.setupMessageObserver();
    this.restoreDraft();
  }

  setupComposerTools() {
    const inputArea = document.querySelector('.discord-input-area');
    const messageInput = document.getElementById('messageInput');
    if (!inputArea || !messageInput) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'composer-toolbar';
    toolbar.innerHTML = `
      <div class="composer-hint"><i class="bi bi-command"></i> Enter sends • Shift+Enter adds line • /ai for quick bot prompt</div>
      <div class="composer-char-count" id="composerCharCount">0 / 8000</div>
    `;

    inputArea.insertBefore(toolbar, inputArea.firstChild);

    messageInput.addEventListener('input', () => {
      const countElement = document.getElementById('composerCharCount');
      if (!countElement) return;

      countElement.textContent = `${messageInput.value.length} / 8000`;
      countElement.classList.toggle('composer-char-count-warning', messageInput.value.length > 7000);
      localStorage.setItem(this.getDraftKey(), messageInput.value);
    });

    document.addEventListener('chat:message-sent', () => {
      localStorage.removeItem(this.getDraftKey());
      const countElement = document.getElementById('composerCharCount');
      if (!countElement) return;
      countElement.textContent = '0 / 8000';
      countElement.classList.remove('composer-char-count-warning');
    });
  }

  setupSearch() {
    const sidebarBody = document.querySelector('.discord-sidebar .card-body');
    if (!sidebarBody) return;

    const search = document.createElement('div');
    search.className = 'message-search-container';
    search.innerHTML = `
      <div class="search-input-group">
        <i class="bi bi-search"></i>
        <input type="text" id="messageSearch" placeholder="Search room messages">
      </div>
    `;

    sidebarBody.insertBefore(search, sidebarBody.firstChild);

    const input = search.querySelector('#messageSearch');
    input.addEventListener('input', event => {
      this.searchQuery = event.target.value.trim().toLowerCase();
      this.filterMessages();
    });
  }

  setupMessageObserver() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const observer = new MutationObserver(() => {
      this.filterMessages();
    });

    observer.observe(chatMessages, { childList: true, subtree: true });
  }

  filterMessages() {
    const messages = document.querySelectorAll('#chatMessages .discord-message');
    messages.forEach(message => {
      const text = message.querySelector('.discord-message-text')?.textContent?.toLowerCase() || '';
      const visible = !this.searchQuery || text.includes(this.searchQuery);
      message.classList.toggle('message-hidden', !visible);
    });
  }

  restoreDraft() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;

    const draft = localStorage.getItem(this.getDraftKey());
    if (!draft) return;

    messageInput.value = draft;
    messageInput.dispatchEvent(new Event('input'));
  }

  getDraftKey() {
    const roomName = document.getElementById('roomName')?.textContent || 'general';
    return `chatify:draft:${roomName}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.nexusFeatures = new NexusFeatures();
});
