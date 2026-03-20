import { apiService } from '../../services/api.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapCommunityPanelMethods = {
  setupFriendSearchHandlers() {
    if (this._friendSearchHandlersReady || !this.input?.keyboard) return;

    this._friendSearchHandlersReady = true;
    this._friendSearchKeydownHandler = (event) => this.handleFriendSearchKeydown(event);
    this._friendSearchPointerDownHandler = (_pointer, currentlyOver) => this.handleFriendSearchPointerDown(currentlyOver);

    this.input.keyboard.on('keydown', this._friendSearchKeydownHandler);
    this.input.on('pointerdown', this._friendSearchPointerDownHandler);

    this.events.once('shutdown', () => this.teardownFriendSearchHandlers());
    this.events.once('destroy', () => this.teardownFriendSearchHandlers());
  },

  teardownFriendSearchHandlers() {
    if (!this._friendSearchHandlersReady) return;

    if (this._friendSearchKeydownHandler) {
      this.input?.keyboard?.off('keydown', this._friendSearchKeydownHandler);
    }
    if (this._friendSearchPointerDownHandler) {
      this.input?.off('pointerdown', this._friendSearchPointerDownHandler);
    }
    if (this.friendSearchDebounceTimer) {
      this.friendSearchDebounceTimer.remove(false);
      this.friendSearchDebounceTimer = null;
    }

    this._friendSearchHandlersReady = false;
    this._friendSearchKeydownHandler = null;
    this._friendSearchPointerDownHandler = null;
    this.isFriendSearchFocused = false;
  },

  handleFriendSearchPointerDown(currentlyOver = []) {
    if (this._skipNextFriendSearchBlur) {
      this._skipNextFriendSearchBlur = false;
      return;
    }
    if (!this.isFriendSearchFocused) return;

    const clickedSearch = currentlyOver.some((obj) => obj?.getData?.('friend-search-hit') || obj?.getData?.('friend-search-clear'));
    if (clickedSearch) return;

    this.isFriendSearchFocused = false;
    this.refreshCommunityPanel();
  },

  handleFriendSearchKeydown(event) {
    const key = String(event?.key || '');
    const isPrintable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    const isDelete = key === 'Backspace';

    // Fallback: allow direct typing to focus friend search if click focus is missed.
    if (!this.isFriendSearchFocused) {
      if ((isPrintable || isDelete) && !this.isMapSearchFocused) {
        this.isFriendSearchFocused = true;
      } else {
        return;
      }
    }

    const previousQuery = this.friendSearchQuery || '';
    let nextQuery = previousQuery;
    let shouldBlur = false;

    if (key === 'Escape' || key === 'Enter') {
      shouldBlur = true;
    } else if (key === 'Backspace') {
      nextQuery = previousQuery.slice(0, -1);
    } else if (isPrintable) {
      nextQuery = `${previousQuery}${key}`.slice(0, 30);
    }

    if (nextQuery !== previousQuery) {
      this.friendSearchQuery = nextQuery;
      this.scheduleFriendSearch();
    }

    if (shouldBlur) {
      this.isFriendSearchFocused = false;
    }

    if (nextQuery !== previousQuery || shouldBlur) {
      if (typeof event?.preventDefault === 'function') event.preventDefault();
      this.refreshCommunityPanel();
    }
  },

  scheduleFriendSearch() {
    if (this.friendSearchDebounceTimer) {
      this.friendSearchDebounceTimer.remove(false);
      this.friendSearchDebounceTimer = null;
    }

    this.friendSearchDebounceTimer = this.time.delayedCall(280, () => {
      void this.runFriendSearch();
    });
  },

  async runFriendSearch() {
    const query = String(this.friendSearchQuery || '').trim();
    if (query.length < 2) {
      this.friendSearchResults = [];
      this.friendSearchError = query.length === 0 ? '' : 'Type at least 2 characters.';
      this.friendSearchLoading = false;
      this.refreshCommunityPanel();
      return;
    }

    this.friendSearchLoading = true;
    this.friendSearchError = '';
    this.refreshCommunityPanel();

    try {
      const results = await apiService.searchFriends(query, 8);
      this.friendSearchResults = Array.isArray(results) ? results : [];
    } catch (error) {
      this.friendSearchResults = [];
      this.friendSearchError = error?.response?.data?.message || 'Friend search failed.';
    } finally {
      this.friendSearchLoading = false;
      this.refreshCommunityPanel();
    }
  },

  async loadFriendData() {
    this.friendDataLoading = true;
    this.refreshCommunityPanel();

    try {
      const [incoming, friends] = await Promise.all([
        apiService.getIncomingFriendRequests(),
        apiService.getFriendsList()
      ]);
      this.friendRequestsIncoming = Array.isArray(incoming) ? incoming : [];
      this.friendList = Array.isArray(friends) ? friends : [];
    } catch (error) {
      this.friendActionMessage = error?.response?.data?.message || 'Failed to load friend data.';
    } finally {
      this.friendDataLoading = false;
      this.refreshCommunityPanel();
    }
  },

  async sendFriendRequestAndRefresh(targetLearnerId) {
    try {
      await apiService.sendFriendRequest(targetLearnerId);
      this.friendActionMessage = 'Friend request sent.';
      const tasks = [this.loadFriendData()];
      if (String(this.friendSearchQuery || '').trim().length >= 2) tasks.push(this.runFriendSearch());
      await Promise.all(tasks);
    } catch (error) {
      this.friendActionMessage = error?.response?.data?.message || 'Unable to send friend request.';
      this.refreshCommunityPanel();
    }
  },

  async acceptFriendRequestAndRefresh(friendshipId) {
    try {
      await apiService.acceptFriendRequest(friendshipId);
      this.friendActionMessage = 'Friend request accepted.';
      const tasks = [this.loadFriendData()];
      if (String(this.friendSearchQuery || '').trim().length >= 2) tasks.push(this.runFriendSearch());
      await Promise.all(tasks);
    } catch (error) {
      this.friendActionMessage = error?.response?.data?.message || 'Unable to accept request.';
      this.refreshCommunityPanel();
    }
  },

  async declineFriendRequestAndRefresh(friendshipId) {
    try {
      await apiService.declineFriendRequest(friendshipId);
      this.friendActionMessage = 'Friend request declined.';
      const tasks = [this.loadFriendData()];
      if (String(this.friendSearchQuery || '').trim().length >= 2) tasks.push(this.runFriendSearch());
      await Promise.all(tasks);
    } catch (error) {
      this.friendActionMessage = error?.response?.data?.message || 'Unable to decline request.';
      this.refreshCommunityPanel();
    }
  },

  async removeFriendAndRefresh(friendLearnerId) {
    try {
      await apiService.removeFriend(friendLearnerId);
      this.friendActionMessage = 'Friend removed.';
      const tasks = [this.loadFriendData()];
      if (String(this.friendSearchQuery || '').trim().length >= 2) tasks.push(this.runFriendSearch());
      await Promise.all(tasks);
    } catch (error) {
      this.friendActionMessage = error?.response?.data?.message || 'Unable to remove friend.';
      this.refreshCommunityPanel();
    }
  },

  refreshCommunityPanel() {
    if (!this.panels?.community) return;
    this.populateCommunityPanel(this.panels.community);
  },

  createFriendSearchBar(x, y, width) {
    const barHeight = 42;
    const query = this.friendSearchQuery || '';
    const hasQuery = Boolean(query.trim());
    const frameFill = this.isFriendSearchFocused ? 0x242a50 : 0x161934;
    const frameBorder = this.isFriendSearchFocused ? P.borderGlow : P.borderGold;
    const display = hasQuery ? this.truncate(query, 26) : 'Find by username...';
    const textColor = hasQuery ? P.textMain : P.textDisabled;

    const bar = this.add.container(x, y);
    const frame = this.add.graphics();
    frame.fillStyle(frameFill, 0.95);
    frame.fillRoundedRect(0, 0, width, barHeight, 6);
    frame.lineStyle(2, frameBorder, 1);
    frame.strokeRoundedRect(0, 0, width, barHeight, 6);
    bar.add(frame);

    bar.add(this.add.text(12, barHeight / 2, display, {
      fontSize: '13px',
      color: textColor,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0, 0.5));

    const searchHit = this.add.rectangle(width / 2, barHeight / 2, width, barHeight, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setData('friend-search-hit', true);
    searchHit.on('pointerdown', () => {
      this._skipNextFriendSearchBlur = true;
      this.isFriendSearchFocused = true;
      this.refreshCommunityPanel();
    });
    bar.add(searchHit);

    if (hasQuery) {
      const clearLabel = this.add.text(width - 10, barHeight / 2, 'Clear', {
        fontSize: '12px',
        color: P.warn,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(1, 0.5);
      bar.add(clearLabel);

      const clearHit = this.add.rectangle(width - 38, barHeight / 2, 60, barHeight, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setData('friend-search-clear', true);
      clearHit.on('pointerdown', () => {
        this._skipNextFriendSearchBlur = true;
        this.friendSearchQuery = '';
        this.isFriendSearchFocused = true;
        this.friendSearchResults = [];
        this.friendSearchError = '';
        this.refreshCommunityPanel();
      });
      bar.add(clearHit);
    }

    return { bar, barHeight };
  },

  renderFriendSearchResults(c, panel, y, textWidth) {
    const pad = panel.pad;
    const lineHeight = 44;

    if (this.friendSearchLoading) {
      c.add(this.add.text(pad, y, 'Searching users...', {
        fontSize: '13px',
        color: P.textDesc,
        stroke: '#060814',
        strokeThickness: 3
      }));
      return y + 26;
    }

    if (this.friendSearchError) {
      c.add(this.add.text(pad, y, this.friendSearchError, {
        fontSize: '13px',
        color: P.warn,
        stroke: '#060814',
        strokeThickness: 3
      }));
      return y + 26;
    }

    if (!this.friendSearchResults.length) {
      const query = String(this.friendSearchQuery || '').trim();
      const hint = query.length >= 2 ? 'No users found for that username.' : 'Click search and type at least 2 characters.';
      c.add(this.add.text(pad, y, hint, {
        fontSize: '13px',
        color: P.textDesc,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: textWidth }
      }));
      return y + 34;
    }

    this.friendSearchResults.forEach((result) => {
      const username = result?.username || 'Unknown';
      const level = result?.level ?? '-';
      const relationship = result?.relationship || 'NONE';

      c.add(this.add.text(pad, y, `${this.truncate(username, 18)}  |  Lv ${level}`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));

      if (relationship === 'NONE') {
        c.add(this.createButton(panel.width - pad - 92, y - 6, 92, 32, 'Add', () => {
          void this.sendFriendRequestAndRefresh(result.learnerId);
        }));
      } else if (relationship === 'PENDING_OUT') {
        c.add(this.createButton(panel.width - pad - 122, y - 6, 122, 32, 'Requested', null, true));
      } else if (relationship === 'PENDING_IN') {
        c.add(this.createButton(panel.width - pad - 196, y - 6, 92, 32, 'Accept', () => {
          const req = this.friendRequestsIncoming.find((r) => r?.requester?.learnerId === result.learnerId);
          if (req?.friendshipId) void this.acceptFriendRequestAndRefresh(req.friendshipId);
        }));
        c.add(this.createButton(panel.width - pad - 96, y - 6, 92, 32, 'Decline', () => {
          const req = this.friendRequestsIncoming.find((r) => r?.requester?.learnerId === result.learnerId);
          if (req?.friendshipId) void this.declineFriendRequestAndRefresh(req.friendshipId);
        }));
      } else {
        c.add(this.createButton(panel.width - pad - 122, y - 6, 122, 32, 'Friends', null, true));
      }

      y += lineHeight;
    });

    return y;
  },

  renderIncomingRequests(c, panel, y, textWidth) {
    const pad = panel.pad;
    c.add(this.add.text(pad, y, `Incoming Requests (${this.friendRequestsIncoming.length})`, {
      fontSize: '14px',
      color: P.good,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 24;

    if (!this.friendRequestsIncoming.length) {
      c.add(this.add.text(pad, y, 'No pending requests.', {
        fontSize: '12px',
        color: P.textDesc,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: textWidth }
      }));
      return y + 24;
    }

    this.friendRequestsIncoming.forEach((request) => {
      const requester = request?.requester?.username || 'Unknown';
      c.add(this.add.text(pad, y, `${this.truncate(requester, 20)} sent a request`, {
        fontSize: '12px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));
      c.add(this.createButton(panel.width - pad - 196, y - 6, 92, 32, 'Accept', () => {
        void this.acceptFriendRequestAndRefresh(request.friendshipId);
      }));
      c.add(this.createButton(panel.width - pad - 96, y - 6, 92, 32, 'Decline', () => {
        void this.declineFriendRequestAndRefresh(request.friendshipId);
      }));
      y += 40;
    });
    return y;
  },

  renderFriendList(c, panel, y, textWidth) {
    const pad = panel.pad;
    c.add(this.add.text(pad, y, `Your Friends (${this.friendList.length})`, {
      fontSize: '14px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 24;

    if (!this.friendList.length) {
      c.add(this.add.text(pad, y, 'No friends yet. Search by username to add one.', {
        fontSize: '12px',
        color: P.textDesc,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: textWidth }
      }));
      return y + 28;
    }

    this.friendList.forEach((friend) => {
      c.add(this.add.text(pad, y, `${this.truncate(friend?.username || 'Unknown', 20)}  |  Lv ${friend?.level ?? '-'}`, {
        fontSize: '12px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));
      c.add(this.createButton(panel.width - pad - 96, y - 6, 92, 32, 'Remove', () => {
        void this.removeFriendAndRefresh(friend.learnerId);
      }));
      y += 40;
    });

    return y;
  },

  populateCommunityPanel(panel) {
    this.clearPanelBody(panel);

    const c = this.createScrollableBody(panel, { left: 0, right: 0, top: 0, bottom: 24 });
    const pad = panel.pad;
    const textWidth = panel.width - pad * 2;
    const map = this.selectedMap;

    if (!map) {
      c.add(this.add.text(pad, 18, 'No community data available.', {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));
      this.setPanelScrollMetrics(panel, 80);
      return;
    }

    const spotlight = mapDiscoveryService.getCreatorSpotlight(this.catalog);
    const trendLeader = [...this.catalog].sort((a, b) => b.socialProof.trendScore - a.socialProof.trendScore)[0];

    let y = 18;
    c.add(this.add.text(pad, y, `${map.socialProof.rating.toFixed(1)}\u2605 average from ${this.formatCompact(map.socialProof.ratingCount)} ratings`, {
      fontSize: '16px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 28;

    c.add(this.add.text(pad, y, `${this.formatCompact(map.socialProof.likes)} likes  |  ${this.formatCompact(map.socialProof.completions)} completions  |  ${map.socialProof.remixCount} remixes`, {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }));
    y += 26;

    c.add(this.add.text(pad, y, `Creator rep ${this.formatCompact(map.socialProof.creatorRep)}  |  trend ${this.formatCompact(map.socialProof.trendScore)}  |  your clears ${map.playerState.completions}`, {
      fontSize: '13px',
      color: P.textDesc,
      stroke: '#060814',
      strokeThickness: 3
    }));
    y += 36;

    const likeButtonWidth = 160;
    const enterButtonWidth = 220;
    const buttonHeight = 42;
    const enterButtonX = Math.max(pad + likeButtonWidth + 16, panel.width - pad - enterButtonWidth);

    c.add(this.createButton(pad, y, likeButtonWidth, buttonHeight, map.playerState.liked ? 'Unlike Map' : 'Like Map', () => {
      void this.toggleSelectedMapLike(map);
    }));

    c.add(this.createButton(enterButtonX, y, enterButtonWidth, buttonHeight, map.unlocked ? 'Enter Highlighted Gate' : map.unlockText, () => {
      if (map.unlocked) this.enterMap(map);
    }, !map.unlocked));
    y += 58;

    c.add(this.add.text(pad, y, `Your rating: ${map.playerState.rating || 0}\u2605`, {
      fontSize: '14px',
      color: P.textMain,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 28;

    [1, 2, 3, 4, 5].forEach((rating, index) => {
      c.add(this.createButton(pad + index * 72, y, 64, 38, `${rating}\u2605`, () => {
        void this.rateSelectedMap(map, rating);
      }, map.playerState.rating === rating));
    });
    y += 56;

    c.add(this.add.text(pad, y, 'Creator spotlight', {
      fontSize: '15px',
      color: P.good,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 28;

    spotlight.forEach((entry, index) => {
      c.add(this.add.text(pad, y, `${index + 1}. ${entry.creatorName}  |  ${entry.name}`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));

      c.add(this.add.text(panel.width - pad, y, `${this.formatCompact(entry.socialProof.creatorRep)} rep`, {
        fontSize: '13px',
        color: P.gold,
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(1, 0));
      y += 26;
    });

    if (trendLeader) {
      y += 8;
      c.add(this.add.text(pad, y, 'Trending now', {
        fontSize: '15px',
        color: P.warn,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      y += 24;

      const trendText = this.add.text(pad, y, `${trendLeader.name} is leading discovery this week with ${trendLeader.socialProof.likes} likes and ${trendLeader.socialProof.completions} clears.`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: textWidth }
      });
      c.add(trendText);
      y += trendText.height + 12;
    }

    y += 10;
    const divider = this.add.graphics();
    divider.lineStyle(1, P.borderGold, 0.35);
    divider.beginPath();
    divider.moveTo(pad, y);
    divider.lineTo(panel.width - pad, y);
    divider.strokePath();
    c.add(divider);
    y += 12;

    c.add(this.add.text(pad, y, 'Friends', {
      fontSize: '16px',
      color: P.textMain,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 26;

    if (this.friendDataLoading) {
      c.add(this.add.text(pad, y, 'Loading friend data...', {
        fontSize: '13px',
        color: P.textDesc,
        stroke: '#060814',
        strokeThickness: 3
      }));
      y += 26;
    }

    const searchWidth = panel.width - pad * 2;
    const searchBar = this.createFriendSearchBar(pad, y, searchWidth);
    c.add(searchBar.bar);
    y += searchBar.barHeight + 10;

    y = this.renderFriendSearchResults(c, panel, y, textWidth);
    y += 8;
    y = this.renderIncomingRequests(c, panel, y, textWidth);
    y += 8;
    y = this.renderFriendList(c, panel, y, textWidth);

    if (this.friendActionMessage) {
      y += 8;
      c.add(this.add.text(pad, y, this.friendActionMessage, {
        fontSize: '12px',
        color: P.warn,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: textWidth }
      }));
      y += 24;
    }

    this.setPanelScrollMetrics(panel, y);
  }
};

