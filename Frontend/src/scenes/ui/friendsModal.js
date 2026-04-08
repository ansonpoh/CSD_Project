import { apiService } from '../../services/api.js';
import { createUiButton, stopPointerPropagation } from './shared.js';
import { UI_TOKENS } from './uiTokens.js';

const DEPTH = 1100;
const PANEL_W = 860;
const PANEL_H = 590;
const ROW_H = 48;
const CHAT_POLL_MS = 4000;
const PANEL_PAD = 24;
const SECTION_STATUS_BADGE_W = 104;
const SECTION_STATUS_X_OFFSET = 292;

const C = {
  bgPanel: 0x071022,
  bgCard: 0x11213f,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  textMain: '#e8f1ff',
  textDim: '#a9bad7',
  textWarn: '#ff9f9f',
  textGood: '#8fd45e'
};

const STATE_THEME = {
  loading: { label: 'Loading', color: '#9eb7d7', fill: 0x1b2d4a, border: 0x4a6a9a },
  empty: { label: 'Empty', color: '#cbb899', fill: 0x2e2414, border: 0x7a6440 },
  success: { label: 'Success', color: '#8fd45e', fill: 0x18331a, border: 0x4b7a2f },
  error: { label: 'Error', color: '#ff9f9f', fill: 0x3a0e0e, border: 0x8b2020 }
};

function truncate(value, max = 24) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}...` : text;
}

function toMillis(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function mergeMessages(existing = [], incoming = []) {
  const map = new Map();
  existing.forEach((msg) => {
    if (msg?.chatMessageId) map.set(msg.chatMessageId, msg);
  });
  incoming.forEach((msg) => {
    if (msg?.chatMessageId) map.set(msg.chatMessageId, msg);
  });
  return Array.from(map.values()).sort((a, b) => {
    const byTime = toMillis(a?.createdAt) - toMillis(b?.createdAt);
    if (byTime !== 0) return byTime;
    return String(a?.chatMessageId || '').localeCompare(String(b?.chatMessageId || ''));
  });
}

export function showFriends(scene) {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const panelX = width / 2 - PANEL_W / 2;
  const panelY = height / 2 - PANEL_H / 2;

  const nodes = [];
  const dynamicNodes = [];
  const destroyList = (list) => {
    while (list.length) list.pop()?.destroy?.();
  };

  const state = {
    query: '',
    focused: false,
    loadingSearch: false,
    searchStatus: 'empty',
    searchError: '',
    searchResults: [],
    loadingData: false,
    dataStatus: 'loading',
    dataError: '',
    incoming: [],
    friends: [],
    conversationsByFriendId: {},
    actionMessage: '',
    debounceTimer: null,
    skipNextBlur: false,
    chatPollTimer: null,
    chat: {
      active: false,
      loading: false,
      loadingOlder: false,
      loadingHistory: false,
      error: '',
      sending: false,
      clearing: false,
      focusedInput: false,
      friend: null,
      conversationId: null,
      messages: [],
      nextCursor: null,
      draft: '',
      muted: false,
      blocked: false,
      scrollY: 0,
      maxScrollY: 0,
      scrollToBottom: true,
      listBounds: null
    }
  };

  const clearChatPolling = () => {
    if (state.chatPollTimer) {
      state.chatPollTimer.remove(false);
      state.chatPollTimer = null;
    }
  };

  const cleanup = () => {
    if (state.debounceTimer) {
      state.debounceTimer.remove(false);
      state.debounceTimer = null;
    }
    clearChatPolling();
    scene.input?.keyboard?.off('keydown', keydownHandler);
    scene.input?.off('pointerdown', pointerdownHandler);
    scene.input?.off('wheel', wheelHandler);
    destroyList(dynamicNodes);
    destroyList(nodes);
  };

  const overlay = stopPointerPropagation(
    scene.add.rectangle(0, 0, width, height, UI_TOKENS.colors.overlay, 0.8)
      .setOrigin(0)
      .setInteractive()
      .setDepth(DEPTH)
  );
  overlay.on('pointerup', (pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    const px = Number(pointer?.x);
    const py = Number(pointer?.y);
    const insidePanel = Number.isFinite(px)
      && Number.isFinite(py)
      && px >= panelX
      && px <= (panelX + PANEL_W)
      && py >= panelY
      && py <= (panelY + PANEL_H);
    if (!insidePanel) {
      cleanup();
    }
  });
  nodes.push(overlay);

  const panel = scene.add.graphics().setDepth(DEPTH + 1);
  panel.fillStyle(C.bgPanel, 0.98);
  panel.fillRoundedRect(panelX, panelY, PANEL_W, PANEL_H, 7);
  panel.lineStyle(2, C.borderGold, 0.9);
  panel.strokeRoundedRect(panelX, panelY, PANEL_W, PANEL_H, 7);
  nodes.push(panel);

  nodes.push(
    scene.add.text(panelX + PANEL_W / 2, panelY + 32, 'FRIENDS', {
      fontSize: '30px',
      color: '#f4f8ff',
      fontStyle: 'bold',
      stroke: '#13233d',
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(DEPTH + 3)
  );

  const closeButton = scene.add.sprite(panelX + PANEL_W - 30, panelY + 30, 'ui-close-btn', 0)
    .setScale(1.6)
    .setDepth(DEPTH + 4)
    .setInteractive({ useHandCursor: true });
  closeButton.on('pointerover', () => closeButton.setFrame(1));
  closeButton.on('pointerout', () => closeButton.setFrame(0));
  closeButton.on('pointerdown', (_pointer, _localX, _localY, event) => event?.stopPropagation?.());
  closeButton.on('pointerup', cleanup);
  nodes.push(closeButton);

  const statusText = scene.add.text(panelX + 24, panelY + PANEL_H - 28, '', {
    fontSize: '12px',
    color: UI_TOKENS.colors.textInfo,
    stroke: '#060814',
    strokeThickness: 3
  }).setDepth(DEPTH + 4);
  nodes.push(statusText);

  const setStatus = (text, color = UI_TOKENS.colors.textInfo) => {
    statusText.setColor(color);
    statusText.setText(text || '');
  };

  const drawStateTag = (x, y, status, message, options = {}) => {
    const badgeW = Number.isFinite(options?.badgeWidth) ? options.badgeWidth : 96;
    const theme = STATE_THEME[status] || STATE_THEME.loading;
    const pill = scene.add.graphics().setDepth(DEPTH + 4);
    pill.fillStyle(theme.fill, 0.96);
    pill.fillRoundedRect(x, y, badgeW, 20, 4);
    pill.lineStyle(1, theme.border, 0.9);
    pill.strokeRoundedRect(x, y, badgeW, 20, 4);
    dynamicNodes.push(pill);

    dynamicNodes.push(
      scene.add.text(x + (badgeW / 2), y + 10, theme.label, {
        fontSize: '10px',
        fontStyle: 'bold',
        color: theme.color,
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(DEPTH + 5)
    );

    if (message) {
      dynamicNodes.push(
        scene.add.text(x + badgeW + 8, y + 10, message, {
          fontSize: '11px',
          color: theme.color,
          stroke: '#060814',
          strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(DEPTH + 4)
      );
    }
  };

  const syncConversationMap = (conversations) => {
    const map = {};
    (Array.isArray(conversations) ? conversations : []).forEach((conversation) => {
      const friendId = conversation?.friend?.learnerId;
      if (friendId) map[friendId] = conversation;
    });
    state.conversationsByFriendId = map;
  };

  const refreshChatMessages = async (options = {}) => {
    if (!state.chat.active || !state.chat.conversationId) return;
    const silent = options.silent === true;
    const wasNearBottom = (state.chat.maxScrollY - state.chat.scrollY) <= 24;
    if (!silent) {
      state.chat.loading = true;
      draw();
    }
    try {
      const page = await apiService.getConversationMessages(state.chat.conversationId, null, 30);
      state.chat.messages = mergeMessages(state.chat.messages, Array.isArray(page?.messages) ? page.messages : []);
      if (page?.nextCursor) state.chat.nextCursor = page.nextCursor;
      else state.chat.nextCursor = null;
      state.chat.error = '';
      if (wasNearBottom) state.chat.scrollToBottom = true;
      const conversations = await apiService.getChatConversations();
      syncConversationMap(conversations);
    } catch (error) {
      state.chat.error = error?.response?.data?.message || 'Unable to refresh chat.';
      if (!silent) setStatus(state.chat.error, C.textWarn);
    } finally {
      state.chat.loading = false;
      if (!silent) draw();
    }
  };

  const startChatPolling = () => {
    clearChatPolling();
    state.chatPollTimer = scene.time.addEvent({
      delay: CHAT_POLL_MS,
      loop: true,
      callback: () => {
        if (!state.chat.active || !state.chat.conversationId || state.chat.sending) return;
        void refreshChatMessages({ silent: true });
      }
    });
  };

  const closeChat = () => {
    state.chat.active = false;
    state.chat.loading = false;
    state.chat.loadingOlder = false;
    state.chat.loadingHistory = false;
    state.chat.sending = false;
    state.chat.clearing = false;
    state.chat.focusedInput = false;
    state.chat.friend = null;
    state.chat.conversationId = null;
    state.chat.messages = [];
    state.chat.nextCursor = null;
    state.chat.draft = '';
    state.chat.muted = false;
    state.chat.blocked = false;
    state.chat.scrollY = 0;
    state.chat.maxScrollY = 0;
    state.chat.scrollToBottom = true;
    state.chat.listBounds = null;
    clearChatPolling();
    draw();
  };

  const openChat = async (friend) => {
    const friendId = friend?.learnerId;
    if (!friendId) return;

    state.chat.active = true;
    state.chat.loading = true;
    state.chat.error = '';
    state.chat.clearing = false;
    state.chat.focusedInput = false;
    state.chat.friend = friend;
    state.chat.messages = [];
    state.chat.nextCursor = null;
    state.chat.draft = '';
    state.chat.scrollY = 0;
    state.chat.maxScrollY = 0;
    state.chat.scrollToBottom = true;
    state.chat.listBounds = null;
    draw();

    try {
      const conversation = await apiService.openFriendConversation(friendId);
      const summary = state.conversationsByFriendId[friendId] || {};
      state.chat.friend = conversation?.friend || friend;
      state.chat.conversationId = conversation?.chatConversationId;
      state.chat.muted = Boolean(summary?.muted);
      state.chat.blocked = Boolean(summary?.blocked);
      await refreshChatMessages();
      state.chat.scrollToBottom = true;
      startChatPolling();
      setStatus(`Chat opened with ${state.chat.friend?.username || 'friend'}.`, C.textGood);
      void loadAllChatHistory();
    } catch (error) {
      state.chat.error = error?.response?.data?.message || 'Unable to open chat.';
      setStatus(state.chat.error, C.textWarn);
      closeChat();
    } finally {
      state.chat.loading = false;
      draw();
    }
  };

  const loadOlderMessages = async (options = {}) => {
    if (!state.chat.active || !state.chat.conversationId || !state.chat.nextCursor || state.chat.loadingOlder) return;
    const silent = options.silent === true;
    state.chat.loadingOlder = true;
    if (!silent) draw();
    try {
      const page = await apiService.getConversationMessages(state.chat.conversationId, state.chat.nextCursor, 30);
      state.chat.messages = mergeMessages(state.chat.messages, Array.isArray(page?.messages) ? page.messages : []);
      state.chat.nextCursor = page?.nextCursor || null;
      state.chat.error = '';
    } catch (error) {
      state.chat.error = error?.response?.data?.message || 'Unable to load older chat.';
      if (!silent) setStatus(state.chat.error, C.textWarn);
    } finally {
      state.chat.loadingOlder = false;
      if (!silent) draw();
    }
  };

  const loadAllChatHistory = async () => {
    if (!state.chat.active || !state.chat.conversationId || state.chat.loadingHistory) return;
    if (!state.chat.nextCursor) return;

    state.chat.loadingHistory = true;
    draw();
    try {
      while (state.chat.active && state.chat.conversationId && state.chat.nextCursor) {
        const beforeCount = state.chat.messages.length;
        await loadOlderMessages({ silent: true });
        if (state.chat.messages.length === beforeCount) break;
      }
    } finally {
      state.chat.loadingHistory = false;
      draw();
    }
  };

  const scrollChatBy = (deltaY) => {
    if (!state.chat.active) return;
    const max = Math.max(0, Number(state.chat.maxScrollY || 0));
    if (max <= 0) return;
    const current = Math.max(0, Number(state.chat.scrollY || 0));
    const next = Math.max(0, Math.min(max, current + deltaY));
    if (next === current) return;
    state.chat.scrollY = next;
    state.chat.scrollToBottom = false;
    draw();
  };

  const sendChatMessage = async () => {
    if (!state.chat.active || !state.chat.conversationId || state.chat.sending || state.chat.clearing) return;
    const conversationId = state.chat.conversationId;
    const body = String(state.chat.draft || '').trim();
    if (!body) return;
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      chatMessageId: tempMessageId,
      chatConversationId: conversationId,
      senderId: null,
      body,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      mine: true,
      pending: true
    };

    state.chat.sending = true;
    state.chat.error = '';
    state.chat.draft = '';
    state.chat.messages = mergeMessages(state.chat.messages, [optimisticMessage]);
    state.chat.scrollToBottom = true;
    draw();
    try {
      const sentMessage = await apiService.sendConversationMessage(conversationId, body);
      state.chat.messages = state.chat.messages.map((msg) => (
        msg?.chatMessageId === tempMessageId
          ? { ...sentMessage, mine: true }
          : msg
      ));
      state.chat.messages = mergeMessages(state.chat.messages, [sentMessage]);
      state.chat.scrollToBottom = true;
      const conversations = await apiService.getChatConversations();
      syncConversationMap(conversations);
    } catch (error) {
      state.chat.messages = state.chat.messages.filter((msg) => msg?.chatMessageId !== tempMessageId);
      state.chat.draft = body;
      state.chat.error = error?.response?.data?.message || 'Unable to send message.';
      setStatus(state.chat.error, C.textWarn);
    } finally {
      state.chat.sending = false;
      draw();
    }
  };

  const clearChatHistory = async () => {
    if (!state.chat.active || !state.chat.conversationId || state.chat.clearing) return;
    const friendName = state.chat.friend?.username || 'this friend';
    const shouldProceed = (typeof window !== 'undefined' && typeof window.confirm === 'function')
      ? window.confirm(`Clear entire chat history with ${friendName}? This cannot be undone.`)
      : true;
    if (!shouldProceed) return;

    state.chat.clearing = true;
    state.chat.error = '';
    draw();
    try {
      await apiService.clearConversationMessages(state.chat.conversationId);
      state.chat.messages = [];
      state.chat.nextCursor = null;
      state.chat.loadingHistory = false;
      state.chat.scrollY = 0;
      state.chat.maxScrollY = 0;
      state.chat.scrollToBottom = true;
      const conversations = await apiService.getChatConversations();
      syncConversationMap(conversations);
      setStatus('Chat history cleared.', C.textGood);
    } catch (error) {
      state.chat.error = error?.response?.data?.message || 'Unable to clear chat history.';
      setStatus(state.chat.error, C.textWarn);
    } finally {
      state.chat.clearing = false;
      draw();
    }
  };

  const toggleSettings = async (payload) => {
    const targetLearnerId = state.chat.friend?.learnerId;
    if (!targetLearnerId) return;
    try {
      const settings = await apiService.updateChatSettings(targetLearnerId, payload);
      state.chat.muted = Boolean(settings?.isMuted);
      state.chat.blocked = Boolean(settings?.isBlocked);
      state.chat.error = '';
      setStatus('Chat settings updated.', C.textGood);
      draw();
    } catch (error) {
      state.chat.error = error?.response?.data?.message || 'Unable to update chat settings.';
      setStatus(state.chat.error, C.textWarn);
    }
  };

  const refreshSearch = async () => {
    const query = String(state.query || '').trim();
    if (query.length < 2) {
      state.searchResults = [];
      state.searchError = '';
      state.searchStatus = 'empty';
      state.loadingSearch = false;
      draw();
      return;
    }

    state.loadingSearch = true;
    state.searchStatus = 'loading';
    state.searchError = '';
    draw();

    try {
      const data = await apiService.searchFriends(query, 8);
      state.searchResults = Array.isArray(data) ? data : [];
      state.searchStatus = state.searchResults.length ? 'success' : 'empty';
    } catch (error) {
      state.searchResults = [];
      state.searchError = error?.response?.data?.message || 'Friend search failed.';
      state.searchStatus = 'error';
    } finally {
      state.loadingSearch = false;
      draw();
    }
  };

  const scheduleSearch = () => {
    if (state.debounceTimer) state.debounceTimer.remove(false);
    state.debounceTimer = scene.time.delayedCall(280, () => {
      void refreshSearch();
    });
  };

  const loadData = async () => {
    state.loadingData = true;
    state.dataStatus = 'loading';
    state.dataError = '';
    draw();
    try {
      const [incoming, friends, conversations] = await Promise.all([
        apiService.getIncomingFriendRequests(),
        apiService.getFriendsList(),
        apiService.getChatConversations()
      ]);
      state.incoming = Array.isArray(incoming) ? incoming : [];
      state.friends = Array.isArray(friends) ? friends : [];
      syncConversationMap(conversations);
      state.dataStatus = (state.incoming.length || state.friends.length) ? 'success' : 'empty';
    } catch (error) {
      state.dataStatus = 'error';
      state.dataError = error?.response?.data?.message || 'Failed to load friend/chat data.';
      setStatus(state.dataError, C.textWarn);
    } finally {
      state.loadingData = false;
      draw();
    }
  };

  const runAction = async (message, action, options = {}) => {
    const reloadData = options.reloadData !== false;
    const reloadSearch = options.reloadSearch === true;
    try {
      await action();
      setStatus(message, C.textGood);
      if (reloadData) {
        await loadData();
      }
      if (reloadSearch && String(state.query || '').trim().length >= 2) {
        await refreshSearch();
      }
    } catch (error) {
      setStatus(error?.response?.data?.message || 'Friend action failed.', C.textWarn);
    }
  };

  const buildActionByRelationship = (item) => {
    const relationship = String(item?.relationship || 'NONE');
    if (relationship === 'NONE') {
      return {
        label: 'Add',
        disabled: false,
        onPress: () => runAction(
          'Friend request sent.',
          async () => {
            await apiService.sendFriendRequest(item.learnerId);
            item.relationship = 'PENDING_OUT';
            draw();
          },
          { reloadData: false, reloadSearch: false }
        )
      };
    }
    if (relationship === 'PENDING_OUT') {
      return { label: 'Requested', disabled: true, onPress: null };
    }
    if (relationship === 'PENDING_IN') {
      const req = state.incoming.find((r) => r?.requester?.learnerId === item.learnerId);
      return {
        label: req?.friendshipId ? 'Accept' : 'Pending',
        disabled: !req?.friendshipId,
        onPress: req?.friendshipId
          ? () => runAction('Friend request accepted.', () => apiService.acceptFriendRequest(req.friendshipId))
          : null
      };
    }
    return { label: 'Friends', disabled: true, onPress: null };
  };

  const renderSearchSection = () => {
    const pad = PANEL_PAD;
    let y = 112;
    const barX = panelX + pad;
    const barY = panelY + y;
    const barW = PANEL_W - pad * 2 - 108;
    const barH = 42;
    const hasQuery = Boolean(String(state.query || '').trim());
    const frameFill = state.focused ? 0x2a3568 : 0x161934;
    const frameBorder = state.focused ? C.borderGlow : C.borderGold;
    const display = hasQuery ? truncate(state.query, 46) : (state.focused ? '' : 'Find by username...');

    const bar = scene.add.graphics().setDepth(DEPTH + 3);
    bar.fillStyle(frameFill, 0.95);
    bar.fillRoundedRect(barX, barY, barW, barH, 6);
    bar.lineStyle(state.focused ? 3 : 2, frameBorder, 1);
    bar.strokeRoundedRect(barX, barY, barW, barH, 6);
    dynamicNodes.push(bar);

    dynamicNodes.push(
      scene.add.text(barX + 12, barY + barH / 2, display, {
        fontSize: '15px',
        color: hasQuery ? C.textMain : C.textDim,
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(0, 0.5).setDepth(DEPTH + 4)
    );

    const searchHit = scene.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 5);
    searchHit.setData('friend-modal-search-hit', true);
    searchHit.on('pointerdown', () => {
      state.skipNextBlur = true;
      state.focused = true;
      draw();
    });
    dynamicNodes.push(searchHit);

    if (hasQuery) {
      dynamicNodes.push(
        scene.add.text(barX + barW - 10, barY + barH / 2, 'Clear', {
          fontSize: '12px',
          color: C.textWarn,
          fontStyle: 'bold',
          stroke: '#060814',
          strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(DEPTH + 4)
      );

      const clearHit = scene.add.rectangle(barX + barW - 36, barY + barH / 2, 58, barH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 5);
      clearHit.setData('friend-modal-search-clear', true);
      clearHit.on('pointerdown', () => {
        state.skipNextBlur = true;
        state.query = '';
        state.focused = true;
        state.searchResults = [];
        state.searchError = '';
        state.searchStatus = 'empty';
        draw();
      });
      dynamicNodes.push(clearHit);
    }

    dynamicNodes.push(
      createUiButton(scene, {
        x: barX + barW + 54,
        y: barY + barH / 2,
        width: 96,
        height: 34,
        label: state.loadingSearch ? 'Searching' : 'Search',
        fillNormal: 0x17324f,
        fillHover: 0x24507b,
        borderNormal: C.borderGold,
        borderHover: C.borderGlow,
        lineWidth: 1,
        depth: DEPTH + 6,
        textStyle: { fontSize: '12px' },
        onPress: state.loadingSearch
          ? null
          : () => {
            if (String(state.query || '').trim().length < 2) {
              state.focused = true;
              draw();
              return;
            }
            void refreshSearch();
          }
      })
    );

    y += 56;

    dynamicNodes.push(
      scene.add.text(panelX + pad, panelY + y, 'Search Results', {
        fontSize: '17px',
        color: '#f4c048',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setDepth(DEPTH + 4)
    );
    const searchMessage = state.searchStatus === 'success'
      ? `${state.searchResults.length} match${state.searchResults.length === 1 ? '' : 'es'}`
      : state.searchStatus === 'loading'
        ? 'Searching usernames'
      : state.searchStatus === 'error'
          ? 'Search failed'
          : '';
    drawStateTag(
      panelX + PANEL_W - pad - SECTION_STATUS_X_OFFSET,
      panelY + y - 2,
      state.searchStatus,
      searchMessage,
      { badgeWidth: SECTION_STATUS_BADGE_W }
    );
    y += 30;

    if (state.loadingSearch) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, 'Searching users...', {
          fontSize: '13px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      y += 22;
      return y;
    }

    if (state.searchError) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, state.searchError, {
          fontSize: '13px',
          color: C.textWarn,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      y += 24;
      return y;
    }

    if (!state.searchResults.length) {
      const hint = String(state.query || '').trim().length >= 2
        ? 'No users found for that username.'
        : '';
      if (!hint) {
        return y;
      }
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, hint, {
          fontSize: '13px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      y += 24;
      return y;
    }

    const visibleSearchRows = state.searchResults.slice(0, 3);
    visibleSearchRows.forEach((row) => {
      const box = scene.add.graphics().setDepth(DEPTH + 3);
      box.fillStyle(C.bgCard, 0.92);
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      dynamicNodes.push(box);

      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 14, `${truncate(row?.username || 'Unknown', 22)}  |  Lv ${row?.level ?? '-'}`, {
          fontSize: '13px',
          color: C.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );

      const action = buildActionByRelationship(row);
      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 58,
          y: panelY + y + (ROW_H / 2),
          width: 100,
          height: 32,
          label: action.label,
          fillNormal: action.disabled ? 0x2a2f3d : 0x17324f,
          fillHover: action.disabled ? 0x2a2f3d : 0x24507b,
          borderNormal: action.disabled ? 0x5a6578 : C.borderGold,
          borderHover: action.disabled ? 0x5a6578 : C.borderGlow,
          pressFill: 0x08031a,
          pressBorder: 0x604008,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: action.disabled ? null : action.onPress
        })
      );

      y += ROW_H + 8;
    });

    const overflowCount = Math.max(0, state.searchResults.length - visibleSearchRows.length);
    if (overflowCount > 0) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, `+${overflowCount} more result${overflowCount === 1 ? '' : 's'}`, {
          fontSize: '12px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      y += 18;
    }

    return y;
  };

  const renderIncoming = (startY) => {
    const pad = PANEL_PAD;
    let y = startY + 14;
    const incomingStatus = state.incoming.length ? 'success' : 'empty';
    dynamicNodes.push(
      scene.add.text(panelX + pad, panelY + y, `Incoming Requests (${state.incoming.length})`, {
        fontSize: '17px',
        color: '#8fd45e',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setDepth(DEPTH + 4)
    );
    drawStateTag(
      panelX + PANEL_W - pad - SECTION_STATUS_X_OFFSET,
      panelY + y - 2,
      incomingStatus,
      state.incoming.length ? 'Pending actions' : 'No pending requests',
      { badgeWidth: SECTION_STATUS_BADGE_W }
    );
    y += 30;

    if (!state.incoming.length) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, 'No incoming requests right now.', {
          fontSize: '12px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      return y + 20;
    }

    state.incoming.slice(0, 2).forEach((req) => {
      const box = scene.add.graphics().setDepth(DEPTH + 3);
      box.fillStyle(C.bgCard, 0.92);
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      dynamicNodes.push(box);

      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 14, `${truncate(req?.requester?.username || 'Unknown', 22)} sent a request`, {
          fontSize: '12px',
          color: C.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );

      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 146,
          y: panelY + y + (ROW_H / 2),
          width: 94,
          height: 30,
          label: 'Accept',
          fillNormal: 0x1d4420,
          fillHover: 0x2a5f2f,
          borderNormal: 0x8fd45e,
          borderHover: 0xbff59a,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: () => runAction('Friend request accepted.', () => apiService.acceptFriendRequest(req.friendshipId))
        })
      );

      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 52,
          y: panelY + y + (ROW_H / 2),
          width: 88,
          height: 30,
          label: 'Decline',
          fillNormal: 0x2a2f3d,
          fillHover: 0x3a4256,
          borderNormal: 0x646f86,
          borderHover: C.borderGlow,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: () => runAction('Friend request declined.', () => apiService.declineFriendRequest(req.friendshipId))
        })
      );

      y += ROW_H + 8;
    });

    return y;
  };

  const renderFriends = (startY) => {
    const pad = PANEL_PAD;
    let y = startY + 16;
    const friendStatus = state.friends.length ? 'success' : 'empty';
    dynamicNodes.push(
      scene.add.text(panelX + pad, panelY + y, `Your Friends (${state.friends.length})`, {
        fontSize: '17px',
        color: '#f4c048',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setDepth(DEPTH + 4)
    );
    drawStateTag(
      panelX + PANEL_W - pad - SECTION_STATUS_X_OFFSET,
      panelY + y - 2,
      friendStatus,
      state.friends.length ? 'Chat available' : 'Add new friends',
      { badgeWidth: SECTION_STATUS_BADGE_W }
    );
    y += 30;

    if (!state.friends.length) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, 'No friends yet. Search by username to add your first friend.', {
          fontSize: '12px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      return;
    }

    state.friends.slice(0, 4).forEach((friend) => {
      const conversation = state.conversationsByFriendId[friend?.learnerId] || null;
      const box = scene.add.graphics().setDepth(DEPTH + 3);
      box.fillStyle(C.bgCard, 0.92);
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      dynamicNodes.push(box);

      const label = `${truncate(friend?.username || 'Unknown', 16)}  |  Lv ${friend?.level ?? '-'}`;
      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 14, label, {
          fontSize: '12px',
          color: C.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );

      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 152,
          y: panelY + y + (ROW_H / 2),
          width: 96,
          height: 30,
          label: 'Chat',
          fillNormal: 0x17324f,
          fillHover: 0x24507b,
          borderNormal: C.borderGold,
          borderHover: C.borderGlow,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: () => { void openChat(friend); }
        })
      );

      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 52,
          y: panelY + y + (ROW_H / 2),
          width: 88,
          height: 30,
          label: 'Remove',
          fillNormal: 0x261111,
          fillHover: 0x3a1616,
          borderNormal: 0x7c3333,
          borderHover: C.borderGlow,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: () => {
            const name = friend?.username || 'this friend';
            const shouldProceed = (typeof window !== 'undefined' && typeof window.confirm === 'function')
              ? window.confirm(`Remove ${name} from your friends list?`)
              : true;
            if (!shouldProceed) return;
            void runAction('Friend removed.', () => apiService.removeFriend(friend.learnerId));
          }
        })
      );

      y += ROW_H + 8;
    });
  };

  const renderChatPane = () => {
    const pad = 24;
    const topY = 78;
    const headerY = panelY + topY;
    const friendName = state.chat.friend?.username || 'Friend';
    const chatStatus = state.chat.error
      ? 'error'
      : (state.chat.loading || state.chat.loadingHistory || state.chat.loadingOlder || state.chat.sending || state.chat.clearing)
        ? 'loading'
        : state.chat.messages.length
          ? 'success'
          : 'empty';
    const chatMessage = state.chat.error
      ? 'Action failed'
      : chatStatus === 'loading'
        ? 'Syncing messages'
        : chatStatus === 'success'
          ? `${state.chat.messages.length} message${state.chat.messages.length === 1 ? '' : 's'}`
          : 'No messages yet';

    dynamicNodes.push(
      createUiButton(scene, {
        x: panelX + pad + 54,
        y: headerY + 16,
        width: 108,
        height: 28,
        label: 'Back',
        fillNormal: 0x2a2f3d,
        fillHover: 0x3a4256,
        borderNormal: C.borderGold,
        borderHover: C.borderGlow,
        depth: DEPTH + 6,
        textStyle: { fontSize: '12px' },
        onPress: closeChat
      })
    );

    dynamicNodes.push(
      scene.add.text(panelX + pad + 118, headerY + 14, `Chat with ${truncate(friendName, 14)}`, {
        fontSize: '18px',
        color: C.textMain,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(0, 0.5).setDepth(DEPTH + 4)
    );
    drawStateTag(panelX + pad + 350, headerY + 2, chatStatus, chatMessage);

    dynamicNodes.push(
      createUiButton(scene, {
        x: panelX + PANEL_W - pad - 296,
        y: headerY + 16,
        width: 108,
        height: 28,
        label: state.chat.muted ? 'Unmute' : 'Mute',
        fillNormal: 0x17324f,
        fillHover: 0x24507b,
        borderNormal: C.borderGold,
        borderHover: C.borderGlow,
        depth: DEPTH + 6,
        textStyle: { fontSize: '11px' },
        onPress: () => { void toggleSettings({ isMuted: !state.chat.muted, isBlocked: state.chat.blocked }); }
      })
    );

    dynamicNodes.push(
      createUiButton(scene, {
        x: panelX + PANEL_W - pad - 180,
        y: headerY + 16,
        width: 108,
        height: 28,
        label: state.chat.clearing ? 'Clearing...' : 'Clear Chat',
        fillNormal: 0x3a0e0e,
        fillHover: 0x601818,
        borderNormal: 0x8b2020,
        borderHover: C.borderGlow,
        depth: DEPTH + 6,
        textStyle: { fontSize: '11px' },
        onPress: state.chat.clearing ? null : () => { void clearChatHistory(); }
      })
    );

    dynamicNodes.push(
      createUiButton(scene, {
        x: panelX + PANEL_W - pad - 64,
        y: headerY + 16,
        width: 108,
        height: 28,
        label: state.chat.blocked ? 'Unblock' : 'Block',
        fillNormal: 0x3a0e0e,
        fillHover: 0x601818,
        borderNormal: 0x8b2020,
        borderHover: C.borderGlow,
        depth: DEPTH + 6,
        textStyle: { fontSize: '11px' },
        onPress: () => { void toggleSettings({ isMuted: state.chat.muted, isBlocked: !state.chat.blocked }); }
      })
    );

    const listX = panelX + pad;
    const listY = panelY + topY + 40;
    const listW = PANEL_W - pad * 2;
    const listH = 360;

    const list = scene.add.graphics().setDepth(DEPTH + 3);
    list.fillStyle(C.bgCard, 0.95);
    list.fillRoundedRect(listX, listY, listW, listH, 6);
    list.lineStyle(1, C.borderGold, 0.5);
    list.strokeRoundedRect(listX, listY, listW, listH, 6);
    dynamicNodes.push(list);
    state.chat.listBounds = {
      x: listX,
      y: listY,
      w: listW,
      h: listH
    };

    if (state.chat.nextCursor) {
      dynamicNodes.push(
        createUiButton(scene, {
          x: listX + 70,
          y: listY + 16,
          width: 120,
          height: 24,
          label: state.chat.loadingOlder ? 'Loading...' : 'Load Older',
          fillNormal: 0x2a2f3d,
          fillHover: 0x3a4256,
          borderNormal: C.borderGold,
          borderHover: C.borderGlow,
          depth: DEPTH + 6,
          textStyle: { fontSize: '11px' },
          onPress: (state.chat.loadingOlder || state.chat.clearing) ? null : () => { void loadOlderMessages(); }
        })
      );
    }

    if (state.chat.loadingHistory) {
      dynamicNodes.push(
        scene.add.text(listX + listW - 180, listY + 44, 'Loading full history...', {
          fontSize: '11px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
    }

    if (state.chat.loading && !state.chat.messages.length) {
      dynamicNodes.push(
        scene.add.text(listX + 14, listY + 22, 'Loading conversation...', {
          fontSize: '13px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
    } else if (!state.chat.messages.length) {
      dynamicNodes.push(
        scene.add.text(listX + 14, listY + 22, 'No messages yet. Say hi.', {
          fontSize: '13px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
    } else {
      const viewportPadding = 10;
      const viewportX = listX + viewportPadding;
      const viewportY = listY + viewportPadding;
      const viewportW = listW - viewportPadding * 2;
      const viewportH = listH - viewportPadding * 2;

      const clip = scene.add.graphics().setDepth(DEPTH + 3);
      clip.fillStyle(0xffffff, 1);
      clip.fillRect(viewportX, viewportY, viewportW, viewportH);
      clip.setVisible(false);
      dynamicNodes.push(clip);
      const mask = clip.createGeometryMask();

      const messageNodes = [];
      let contentY = viewportY + 4;
      state.chat.messages.forEach((msg) => {
        const mine = Boolean(msg?.mine);
        const sender = mine ? 'You' : truncate(state.chat.friend?.username || 'Friend', 14);
        const stamp = msg?.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const pending = Boolean(msg?.pending);
        const text = `${sender} [${stamp}]: ${msg?.body || ''}${pending ? ' (sending...)' : ''}`;
        const node = scene.add.text(viewportX + 4, contentY, text, {
          fontSize: '12px',
          color: pending ? C.textDim : (mine ? '#c7f5ff' : C.textMain),
          stroke: '#060814',
          strokeThickness: 3,
          wordWrap: { width: viewportW - 8 }
        }).setDepth(DEPTH + 4);
        node.setMask(mask);
        dynamicNodes.push(node);
        messageNodes.push(node);
        contentY += node.height + 8;
      });

      const contentHeight = Math.max(0, contentY - (viewportY + 4));
      const maxScrollY = Math.max(0, contentHeight - viewportH);
      const desiredScrollY = state.chat.scrollToBottom ? maxScrollY : state.chat.scrollY;
      const clampedScrollY = Math.max(0, Math.min(maxScrollY, desiredScrollY));
      state.chat.maxScrollY = maxScrollY;
      state.chat.scrollY = clampedScrollY;
      state.chat.scrollToBottom = false;
      messageNodes.forEach((node) => node.setY(node.y - clampedScrollY));
    }

    if (state.chat.error) {
      dynamicNodes.push(
        scene.add.text(listX + 14, listY + listH - 18, state.chat.error, {
          fontSize: '11px',
          color: C.textWarn,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
    }

    const inputY = listY + listH + 14;
    const inputH = 68;
    const inputW = listW - 120;

    const inputBg = scene.add.graphics().setDepth(DEPTH + 3);
    inputBg.fillStyle(state.chat.focusedInput ? 0x203156 : 0x161934, 0.98);
    inputBg.fillRoundedRect(listX, inputY, inputW, inputH, 6);
    inputBg.lineStyle(2, state.chat.focusedInput ? C.borderGlow : C.borderGold, 1);
    inputBg.strokeRoundedRect(listX, inputY, inputW, inputH, 6);
    dynamicNodes.push(inputBg);

    const draft = state.chat.draft || '';
    const display = draft.length ? truncate(draft, 165) : (state.chat.focusedInput ? '' : 'Click to type a message...');
    dynamicNodes.push(
      scene.add.text(listX + 12, inputY + 12, display, {
        fontSize: '13px',
        color: draft.length ? C.textMain : C.textDim,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: inputW - 24 }
      }).setDepth(DEPTH + 4)
    );

    const inputHit = scene.add.rectangle(listX + inputW / 2, inputY + inputH / 2, inputW, inputH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 5);
    inputHit.setData('chat-input-hit', true);
    inputHit.on('pointerdown', () => {
      state.skipNextBlur = true;
      state.chat.focusedInput = true;
      state.focused = false;
      draw();
    });
    dynamicNodes.push(inputHit);

    dynamicNodes.push(
      createUiButton(scene, {
        x: listX + listW - 54,
        y: inputY + inputH / 2,
        width: 96,
        height: 36,
        label: state.chat.sending ? 'Sending' : 'Send',
        fillNormal: 0x17324f,
        fillHover: 0x24507b,
        borderNormal: C.borderGold,
        borderHover: C.borderGlow,
        depth: DEPTH + 6,
        textStyle: { fontSize: '12px' },
        onPress: (state.chat.sending || state.chat.clearing) ? null : () => { void sendChatMessage(); }
      })
    );
  };

  const draw = () => {
    destroyList(dynamicNodes);

    if (state.chat.active) {
      renderChatPane();
      return;
    }

    if (state.loadingData || state.dataStatus === 'error') {
      drawStateTag(
        panelX + PANEL_PAD,
        panelY + 78,
        state.loadingData ? 'loading' : 'error',
        state.loadingData ? 'Loading friend and chat data' : 'Unable to load panel data',
        { badgeWidth: SECTION_STATUS_BADGE_W }
      );

      dynamicNodes.push(
        scene.add.text(
          panelX + PANEL_PAD,
          panelY + 108,
          state.loadingData ? 'Please wait...' : (state.dataError || 'Try again in a moment.'),
          {
            fontSize: '14px',
            color: state.loadingData ? C.textDim : C.textWarn,
            stroke: '#060814',
            strokeThickness: 3
          }
        ).setDepth(DEPTH + 4)
      );

      if (!state.loadingData) {
        dynamicNodes.push(
          createUiButton(scene, {
            x: panelX + 104,
            y: panelY + 148,
            width: 130,
            height: 30,
            label: 'Retry',
            fillNormal: 0x17324f,
            fillHover: 0x24507b,
            borderNormal: C.borderGold,
            borderHover: C.borderGlow,
            depth: DEPTH + 6,
            textStyle: { fontSize: '12px' },
            onPress: () => { void loadData(); }
          })
        );
      }
      return;
    }

    drawStateTag(
      panelX + PANEL_PAD,
      panelY + 78,
      state.dataStatus,
      state.dataStatus === 'success'
        ? 'Friend list and chat available'
        : 'No friends or requests yet',
      { badgeWidth: SECTION_STATUS_BADGE_W }
    );

    const yAfterSearch = renderSearchSection();
    const yAfterIncoming = renderIncoming(yAfterSearch);
    renderFriends(yAfterIncoming);
  };

  const keydownHandler = (event) => {
    const key = String(event?.key || '');
    const isPrintable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    const isDelete = key === 'Backspace';

    if (state.chat.active && state.chat.focusedInput) {
      const previousDraft = state.chat.draft || '';
      let nextDraft = previousDraft;
      if (key === 'Escape') {
        state.chat.focusedInput = false;
        if (typeof event?.preventDefault === 'function') event.preventDefault();
        draw();
        return;
      }
      if (key === 'Enter') {
        if (typeof event?.preventDefault === 'function') event.preventDefault();
        void sendChatMessage();
        return;
      }
      if (isDelete) nextDraft = previousDraft.slice(0, -1);
      else if (isPrintable) nextDraft = `${previousDraft}${key}`.slice(0, 1000);

      if (nextDraft !== previousDraft) {
        state.chat.draft = nextDraft;
        if (typeof event?.preventDefault === 'function') event.preventDefault();
        draw();
      }
      return;
    }

    if (key === 'Escape' && !state.focused) {
      if (typeof event?.preventDefault === 'function') event.preventDefault();
      cleanup();
      return;
    }

    if (state.chat.active) return;

    if (!state.focused) {
      if (isPrintable || isDelete) {
        state.focused = true;
      } else {
        return;
      }
    }

    const previous = state.query || '';
    let next = previous;
    let shouldBlur = false;

    if (key === 'Escape' || key === 'Enter') shouldBlur = true;
    else if (key === 'Backspace') next = previous.slice(0, -1);
    else if (isPrintable) next = `${previous}${key}`.slice(0, 36);

    if (next !== previous) {
      state.query = next;
      scheduleSearch();
    }

    if (shouldBlur) state.focused = false;

    if (next !== previous || shouldBlur) {
      if (typeof event?.preventDefault === 'function') event.preventDefault();
      draw();
    }
  };

  const pointerdownHandler = (_pointer, currentlyOver = []) => {
    if (state.skipNextBlur) {
      state.skipNextBlur = false;
      return;
    }

    const pointerX = Number(_pointer?.x);
    const pointerY = Number(_pointer?.y);
    const pointerInsidePanel = Number.isFinite(pointerX)
      && Number.isFinite(pointerY)
      && pointerX >= panelX
      && pointerX <= (panelX + PANEL_W)
      && pointerY >= panelY
      && pointerY <= (panelY + PANEL_H);

    const clickedInsideModal = pointerInsidePanel || currentlyOver.some((obj) => {
      const depth = Number(obj?.depth ?? obj?.parentContainer?.depth ?? -1);
      return Number.isFinite(depth) && depth >= DEPTH + 1;
    });
    if (!clickedInsideModal) {
      cleanup();
      return;
    }
  };

  const wheelHandler = (pointer, _currentlyOver, _deltaX, deltaY) => {
    if (!state.chat.active) return;
    const bounds = state.chat.listBounds;
    if (!bounds) return;
    const px = Number(pointer?.x);
    const py = Number(pointer?.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    if (px < bounds.x || px > bounds.x + bounds.w || py < bounds.y || py > bounds.y + bounds.h) return;
    if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 1) return;
    scrollChatBy(deltaY);
  };

  scene.input.keyboard.on('keydown', keydownHandler);
  scene.input.on('pointerdown', pointerdownHandler);
  scene.input.on('wheel', wheelHandler);

  draw();
  void loadData();

  nodes.push(
    createUiButton(scene, {
      x: panelX + PANEL_W - 74,
      y: panelY + PANEL_H - 28,
      width: 122,
      height: 34,
      label: 'CLOSE',
      fillNormal: UI_TOKENS.colors.danger,
      fillHover: UI_TOKENS.colors.dangerHover,
      borderNormal: UI_TOKENS.colors.dangerBorder,
      borderHover: UI_TOKENS.colors.borderGlow,
      depth: DEPTH + 4,
      onPress: cleanup
    })
  );
}
