import { apiService } from '../../services/api.js';

const STYLES = `
  .chat-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4, 8, 22, 0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
    font-family: 'Georgia', serif;
  }
  .chat-panel {
    background: linear-gradient(160deg, #060f2a 0%, #0d1e45 60%, #060f2a 100%);
    border: 2px solid #c8870a;
    border-radius: 12px;
    width: 480px;
    max-width: 96vw;
    height: 580px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(200,135,10,0.25), 0 8px 32px rgba(0,0,0,0.7);
  }
  .chat-header {
    background: linear-gradient(90deg, #0a1a3a, #142850, #0a1a3a);
    border-bottom: 1px solid #c8870a;
    border-radius: 10px 10px 0 0;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .chat-header-left { display: flex; align-items: center; gap: 10px; }
  .chat-header h2 {
    margin: 0;
    font-size: 18px;
    color: #f4c048;
    letter-spacing: 1px;
    text-shadow: 0 0 12px rgba(244,192,72,0.4);
  }
  .chat-header p {
    margin: 2px 0 0;
    font-size: 11px;
    color: #7ec8f0;
  }
  .chat-header-actions { display: flex; align-items: center; gap: 8px; }
  .chat-clear-btn {
    background: #1a2a4a;
    border: 1px solid #4a6a9a;
    color: #7ec8f0;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Georgia', serif;
  }
  .chat-clear-btn:hover { background: #243a60; color: #a0d8ff; }
  .chat-close {
    background: none;
    border: none;
    color: #b89060;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 6px;
    line-height: 1;
  }
  .chat-close:hover { color: #f4c048; }
  .chat-state {
    margin: 10px 16px 0;
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 8px 10px;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.35px;
  }
  .chat-state--loading { background: #1a2a4a; border-color: #4a6a9a; color: #a7c9f0; }
  .chat-state--empty { background: #2e2414; border-color: #7a6440; color: #d3ba93; }
  .chat-state--success { background: #18331a; border-color: #4b7a2f; color: #8fd45e; }
  .chat-state--error { background: #3a0e0e; border-color: #8b2020; color: #ff9f9f; }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
    scrollbar-color: #c8870a #0a1020;
  }
  .chat-messages::-webkit-scrollbar { width: 6px; }
  .chat-messages::-webkit-scrollbar-track { background: #0a1020; }
  .chat-messages::-webkit-scrollbar-thumb { background: #c8870a; border-radius: 3px; }
  .chat-bubble {
    max-width: 82%;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.55;
  }
  .chat-bubble--user {
    align-self: flex-end;
    background: #1a3a5c;
    border: 1px solid #2a5a8c;
    color: #d0eaff;
    border-radius: 10px 10px 2px 10px;
  }
  .chat-bubble--bot {
    align-self: flex-start;
    background: rgba(244,192,72,0.07);
    border: 1px solid rgba(200,135,10,0.3);
    color: #f4e8c0;
    border-radius: 10px 10px 10px 2px;
  }
  .chat-bubble--error {
    align-self: flex-start;
    background: #3a0e0e;
    border: 1px solid #ff8080;
    color: #ff8080;
    border-radius: 10px 10px 10px 2px;
  }
  .chat-typing {
    align-self: flex-start;
    color: #7a6040;
    font-size: 12px;
    font-style: italic;
    padding: 4px 0;
  }
  .chat-footer {
    border-top: 1px solid rgba(200,135,10,0.3);
    padding: 12px 16px;
    display: flex;
    gap: 10px;
    align-items: flex-end;
    flex-shrink: 0;
  }
  .chat-input {
    flex: 1;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(200,135,10,0.5);
    border-radius: 8px;
    color: #f4e8c0;
    font-size: 13px;
    font-family: 'Georgia', serif;
    padding: 9px 12px;
    resize: none;
    min-height: 40px;
    max-height: 100px;
    box-sizing: border-box;
    outline: none;
  }
  .chat-input::placeholder { color: #5a4a30; }
  .chat-input:focus { border-color: #c8870a; }
  .chat-send-btn {
    background: #1a3a1a;
    border: 1px solid #4ade80;
    color: #4ade80;
    padding: 9px 16px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    font-family: 'Georgia', serif;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .chat-send-btn:hover { background: #225522; }
  .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .chat-empty {
    text-align: center;
    color: #4a5a7a;
    font-size: 13px;
    padding: 40px 20px;
    line-height: 1.8;
  }
`;

function ensureStyles() {
  if (!document.getElementById('chat-modal-styles')) {
    const tag = document.createElement('style');
    tag.id = 'chat-modal-styles';
    tag.textContent = STYLES;
    document.head.appendChild(tag);
  }
}

export function showChatbot(scene) {
  ensureStyles();

  let conversationId = null;
  let sending = false;

  const overlay = document.createElement('div');
  overlay.className = 'chat-overlay';
  overlay.innerHTML = `
    <div class="chat-panel">
      <div class="chat-header">
        <div class="chat-header-left">
          <div>
            <h2>Ask the Oracle</h2>
            <p>Powered by RAG — ask anything about Gen Alpha culture</p>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-clear-btn" id="chat-clear-btn">Clear history</button>
          <button class="chat-close" id="chat-close-btn">&#x2715;</button>
        </div>
      </div>
      <div class="chat-state chat-state--empty" id="chat-state">EMPTY: Start a conversation with the Oracle.</div>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-empty">
          Ask me anything about slang, trends, memes, and Gen Alpha culture.<br>
          I'll do my best to enlighten you, traveller.
        </div>
      </div>
      <div class="chat-footer">
        <textarea class="chat-input" id="chat-input" placeholder="Type your question..." rows="1"></textarea>
        <button class="chat-send-btn" id="chat-send-btn">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const messagesEl = overlay.querySelector('#chat-messages');
  const inputEl = overlay.querySelector('#chat-input');
  const sendBtn = overlay.querySelector('#chat-send-btn');
  const clearBtn = overlay.querySelector('#chat-clear-btn');
  const stateEl = overlay.querySelector('#chat-state');
  let emptyShown = true;

  function setPanelState(status, message) {
    const normalized = ['loading', 'empty', 'success', 'error'].includes(status) ? status : 'loading';
    if (!stateEl) return;
    stateEl.className = `chat-state chat-state--${normalized}`;
    stateEl.textContent = `${normalized.toUpperCase()}: ${message}`;
  }

  function close() {
    overlay.remove();
    scene.input.enabled = true;
  }

  overlay.querySelector('#chat-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  scene.input.enabled = false;

  // Prevent Phaser from swallowing keystrokes in the input
  inputEl.addEventListener('keydown', (e) => e.stopPropagation());
  inputEl.addEventListener('keyup', (e) => e.stopPropagation());

  // Auto-grow textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  // Send on Enter (Shift+Enter for newline)
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  clearBtn.addEventListener('click', async () => {
    if (!conversationId) return;
    setPanelState('loading', 'Clearing conversation history...');
    let clearFailed = false;
    try {
      await apiService.chatbotClearHistory(conversationId);
    } catch (_) {
      clearFailed = true;
    }
    conversationId = null;
    messagesEl.innerHTML = `
      <div class="chat-empty">
        ${clearFailed ? 'Could not clear server history. Start a new local conversation.' : 'Conversation cleared. Ask me something new!'}
      </div>`;
    emptyShown = true;
    setPanelState(clearFailed ? 'error' : 'empty', clearFailed ? 'Could not clear history.' : 'Conversation cleared.');
  });

  function appendBubble(text, type) {
    if (emptyShown) {
      messagesEl.innerHTML = '';
      emptyShown = false;
    }
    const div = document.createElement('div');
    div.className = `chat-bubble chat-bubble--${type}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    if (emptyShown) { messagesEl.innerHTML = ''; emptyShown = false; }
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chat-typing-indicator';
    div.textContent = 'Oracle is thinking...';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('chat-typing-indicator')?.remove();
  }

  async function sendMessage() {
    const query = inputEl.value.trim();
    if (!query || sending) return;

    sending = true;
    setPanelState('loading', 'Waiting for Oracle response...');
    sendBtn.disabled = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';

    appendBubble(query, 'user');
    showTyping();

    try {
      const result = await apiService.chatbotQuery(query, conversationId);
      removeTyping();
      conversationId = result.conversation_id || conversationId;
      appendBubble(result.response || '(no response)', 'bot');
      setPanelState('success', 'Oracle answered your question.');
    } catch (err) {
      removeTyping();
      const status = err?.response?.status;
      const msg = status === 503 || status === 502
        ? 'The Oracle is offline. Please try again later.'
        : 'Something went wrong. Please try again.';
      appendBubble(msg, 'error');
      setPanelState('error', msg);
    } finally {
      sending = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  setPanelState('empty', 'Start a conversation with the Oracle.');
  inputEl.focus();
}
