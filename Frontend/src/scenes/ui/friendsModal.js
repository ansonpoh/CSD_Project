import { apiService } from '../../services/api.js';
import { createUiButton, stopPointerPropagation } from './shared.js';

const DEPTH = 1100;
const PANEL_W = 860;
const PANEL_H = 590;
const ROW_H = 46;

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
    actionMessage: '',
    debounceTimer: null,
    skipNextBlur: false
  };

  const cleanup = () => {
    if (state.debounceTimer) {
      state.debounceTimer.remove(false);
      state.debounceTimer = null;
    }
    scene.input?.keyboard?.off('keydown', keydownHandler);
    scene.input?.off('pointerdown', pointerdownHandler);
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
      const [incoming, friends] = await Promise.all([
        apiService.getIncomingFriendRequests(),
        apiService.getFriendsList()
      ]);
      state.incoming = Array.isArray(incoming) ? incoming : [];
      state.friends = Array.isArray(friends) ? friends : [];
    } catch (error) {
      setStatus(error?.response?.data?.message || 'Failed to load friend data.', C.textWarn);
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

    state.friends.slice(0, 3).forEach((friend) => {
      const box = scene.add.graphics().setDepth(DEPTH + 3);
      box.fillStyle(C.bgCard, 0.92);
      box.fillRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, 40, 5);
      box.lineStyle(1, C.borderGold, 0.45);
      box.strokeRoundedRect(panelX + pad, panelY + y, PANEL_W - pad * 2, 40, 5);
      dynamicNodes.push(box);

      dynamicNodes.push(
        scene.add.text(panelX + pad + 12, panelY + y + 11, `${truncate(friend?.username || 'Unknown', 22)}  |  Lv ${friend?.level ?? '-'}`, {
          fontSize: '12px',
          color: C.textMain,
          stroke: '#060814',
          strokeThickness: 3
        }).setDepth(DEPTH + 4)
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

  const draw = () => {
    destroyList(dynamicNodes);

    if (state.loadingData) {
      dynamicNodes.push(
        scene.add.text(panelX + 24, panelY + 84, 'Loading friend data...', {
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
    if (!state.focused) return;
    const clickedInsideModal = currentlyOver.some((obj) => {
      const depth = Number(obj?.depth ?? obj?.parentContainer?.depth ?? -1);
      return Number.isFinite(depth) && depth >= DEPTH + 1;
    });
    if (clickedInsideModal) return;
    const clickedSearch = currentlyOver.some((obj) =>
      obj?.getData?.('friend-modal-search-hit') || obj?.getData?.('friend-modal-search-clear'));
    if (clickedSearch) return;
    state.focused = false;
    draw();
  };

  scene.input.keyboard.on('keydown', keydownHandler);
  scene.input.on('pointerdown', pointerdownHandler);

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
