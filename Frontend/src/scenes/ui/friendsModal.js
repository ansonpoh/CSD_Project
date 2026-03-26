import { apiService } from '../../services/api.js';
import { createUiButton, stopPointerPropagation } from './shared.js';

const DEPTH = 1100;
const PANEL_W = 860;
const PANEL_H = 590;
const ROW_H = 46;
const CHAT_POLL_MS = 4000;

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
    searchError: '',
    searchResults: [],
    loadingData: false,
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
    scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive()
      .setDepth(DEPTH)
  );
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
    color: '#9eb7d7',
    stroke: '#060814',
    strokeThickness: 3
  }).setDepth(DEPTH + 4);
  nodes.push(statusText);

  const setStatus = (text, color = '#9eb7d7') => {
    statusText.setColor(color);
    statusText.setText(text || '');
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
      if (wasNearBottom) state.chat.scrollToBottom = true;
      const conversations = await apiService.getChatConversations();
      syncConversationMap(conversations);
    } catch (error) {
      if (!silent) setStatus(error?.response?.data?.message || 'Unable to refresh chat.', C.textWarn);
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
      setStatus(error?.response?.data?.message || 'Unable to open chat.', C.textWarn);
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
    } catch (error) {
      if (!silent) setStatus(error?.response?.data?.message || 'Unable to load older chat.', C.textWarn);
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
      setStatus(error?.response?.data?.message || 'Unable to send message.', C.textWarn);
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
      setStatus(error?.response?.data?.message || 'Unable to clear chat history.', C.textWarn);
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
      setStatus('Chat settings updated.', C.textGood);
      draw();
    } catch (error) {
      setStatus(error?.response?.data?.message || 'Unable to update chat settings.', C.textWarn);
    }
  };

  const refreshSearch = async () => {
    const query = String(state.query || '').trim();
    if (query.length < 2) {
      state.searchResults = [];
      state.searchError = query.length === 0 ? '' : 'Type at least 2 characters.';
      state.loadingSearch = false;
      draw();
      return;
    }

    state.loadingSearch = true;
    state.searchError = '';
    draw();

    try {
      const data = await apiService.searchFriends(query, 8);
      state.searchResults = Array.isArray(data) ? data : [];
    } catch (error) {
      state.searchResults = [];
      state.searchError = error?.response?.data?.message || 'Friend search failed.';
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
    } catch (error) {
      setStatus(error?.response?.data?.message || 'Failed to load friend/chat data.', C.textWarn);
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
    const pad = 24;
    let y = 78;
    const barX = panelX + pad;
    const barY = panelY + y;
    const barW = PANEL_W - pad * 2;
    const barH = 40;
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
        fontSize: '14px',
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
        draw();
      });
      dynamicNodes.push(clearHit);
    }

    y += 52;
    if (state.focused) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y - 8, 'Search active: type a username (min 2 characters).', {
          fontSize: '11px',
          color: C.textGood,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      y += 12;
    }

    dynamicNodes.push(
      scene.add.text(panelX + pad, panelY + y, 'Search Results', {
        fontSize: '16px',
        color: '#f4c048',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setDepth(DEPTH + 4)
    );
    y += 28;

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
        : 'Click search and type at least 2 characters.';
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

    state.searchResults.slice(0, 4).forEach((row) => {
      const box = scene.add.graphics().setDepth(DEPTH + 3);
      box.fillStyle(C.bgCard, 0.92);
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, ROW_H, 5);
      dynamicNodes.push(box);

      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 10, `${truncate(row?.username || 'Unknown', 22)}  |  Lv ${row?.level ?? '-'}`, {
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
          y: panelY + y + ROW_H / 2,
          width: 100,
          height: 30,
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

    return y;
  };

  const renderIncoming = (startY) => {
    const pad = 24;
    let y = startY + 10;
    dynamicNodes.push(
      scene.add.text(panelX + pad, panelY + y, `Incoming Requests (${state.incoming.length})`, {
        fontSize: '15px',
        color: '#8fd45e',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setDepth(DEPTH + 4)
    );
    y += 26;

    if (!state.incoming.length) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, 'No pending requests.', {
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
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, 40, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, 40, 5);
      dynamicNodes.push(box);

      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 11, `${truncate(req?.requester?.username || 'Unknown', 22)} sent a request`, {
          fontSize: '12px',
          color: C.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );

      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 146,
          y: panelY + y + 20,
          width: 88,
          height: 26,
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
          y: panelY + y + 20,
          width: 88,
          height: 26,
          label: 'Decline',
          fillNormal: 0x3a0e0e,
          fillHover: 0x601818,
          borderNormal: 0x8b2020,
          borderHover: C.borderGlow,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: () => runAction('Friend request declined.', () => apiService.declineFriendRequest(req.friendshipId))
        })
      );

      y += 46;
    });

    return y;
  };

  const renderFriends = (startY) => {
    const pad = 24;
    let y = startY + 12;
    dynamicNodes.push(
      scene.add.text(panelX + pad, panelY + y, `Your Friends (${state.friends.length})`, {
        fontSize: '15px',
        color: '#f4c048',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setDepth(DEPTH + 4)
    );
    y += 24;

    if (!state.friends.length) {
      dynamicNodes.push(
        scene.add.text(panelX + pad, panelY + y, 'No friends yet. Search by username to add one.', {
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
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, 40, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, 40, 5);
      dynamicNodes.push(box);

      const label = `${truncate(friend?.username || 'Unknown', 16)}  |  Lv ${friend?.level ?? '-'}`;
      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 11, label, {
          fontSize: '12px',
          color: C.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );

      dynamicNodes.push(
        createUiButton(scene, {
          x: panelX + PANEL_W - pad - 152,
          y: panelY + y + 20,
          width: 96,
          height: 26,
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
          y: panelY + y + 20,
          width: 88,
          height: 26,
          label: 'Remove',
          fillNormal: 0x3a0e0e,
          fillHover: 0x601818,
          borderNormal: 0x8b2020,
          borderHover: C.borderGlow,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: { fontSize: '12px' },
          onPress: () => runAction('Friend removed.', () => apiService.removeFriend(friend.learnerId))
        })
      );

      y += 46;
    });
  };

  const renderChatPane = () => {
    const pad = 24;
    const topY = 78;
    const headerY = panelY + topY;
    const friendName = state.chat.friend?.username || 'Friend';

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

    if (state.loadingData) {
      dynamicNodes.push(
        scene.add.text(panelX + 24, panelY + 84, 'Loading friend/chat data...', {
          fontSize: '15px',
          color: C.textDim,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
      );
      return;
    }

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

    const clickedInsideModal = currentlyOver.some((obj) => {
      const depth = Number(obj?.depth ?? obj?.parentContainer?.depth ?? -1);
      return Number.isFinite(depth) && depth >= DEPTH + 1;
    });

    if (state.chat.active && state.chat.focusedInput) {
      const clickedInput = currentlyOver.some((obj) => obj?.getData?.('chat-input-hit'));
      if (!clickedInput && !clickedInsideModal) {
        state.chat.focusedInput = false;
        draw();
      }
    }

    if (!state.focused) return;
    if (clickedInsideModal) return;
    const clickedSearch = currentlyOver.some((obj) =>
      obj?.getData?.('friend-modal-search-hit') || obj?.getData?.('friend-modal-search-clear'));
    if (clickedSearch) return;
    state.focused = false;
    draw();
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
      fillNormal: 0x3a0e0e,
      fillHover: 0x601818,
      borderNormal: 0x8b2020,
      borderHover: C.borderGlow,
      depth: DEPTH + 4,
      onPress: cleanup
    })
  );
}
