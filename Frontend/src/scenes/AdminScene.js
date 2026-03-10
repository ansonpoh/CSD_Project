import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
    this.reviewQueueModal = null;
    this.contributorAccountsModal = null;
    this.telemetryModal = null;
    this.flagQueueModal = null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x1a1110);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1110);
    this.add.circle(width * 0.24, height * 0.24, 220, 0x6b1f1a, 0.14);
    this.add.circle(width * 0.78, height * 0.74, 280, 0x442018, 0.16);

    this.add.text(width / 2, 88, 'ADMIN PORTAL', {
      fontSize: '42px',
      color: '#ffe8dc',
      fontStyle: 'bold',
      stroke: '#240d09',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Moderate and manage platform content', {
      fontSize: '18px',
      color: '#efb9a2',
      stroke: '#240d09',
      strokeThickness: 3
    }).setOrigin(0.5);

    const panelW = 980;
    const panelH = 500;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x2a1713, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const cardW = 220;
    const cardH = 150;
    const gap = 20;
    const totalCards = 4;
    const startX = width / 2 - ((cardW * totalCards + gap * (totalCards - 1)) / 2) + cardW / 2;
    const y = panelY + 146;

    this.createActionCard(startX, y, cardW, cardH, 'Review Queue', 'Fetch pending moderation queue', async () => {
      await this.openReviewQueueWorkflow();
    });

    this.createActionCard(startX + (cardW + gap) * 1, y, cardW, cardH, 'Flagged Content', 'Review learner reports', async () => {
      await this.openFlagQueueWorkflow();
    });

    this.createActionCard(startX + (cardW + gap) * 2, y, cardW, cardH, 'Contributors', 'View contributor accounts', async () => {
      await this.openContributorsWorkflow();
    });

    this.createActionCard(startX + (cardW + gap) * 3, y, cardW, cardH, 'Telemetry', 'Encounter funnel dashboard', async () => {
      await this.openTelemetryWorkflow();
    });

    this.createButton(width / 2 - 90, panelY + panelH - 66, 180, 42, 'Logout', async () => {
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
      this.destroyTelemetryModal();
      this.destroyContributorDetailsModal();
      await supabase.auth.signOut();
      gameState.clearState();
      this.scene.start('LoginScene');
    }, 0x4a1111, 0x7a1b1b);

    this.events.once('shutdown', () => {
      this.destroyFlagQueueModal();
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
      this.destroyTelemetryModal();
      this.destroyContributorDetailsModal();
    });
    this.events.once('destroy', () => {
      this.destroyFlagQueueModal();
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
      this.destroyTelemetryModal();
      this.destroyContributorDetailsModal();
    });
  }

  async openContributorsWorkflow() {
    if (this.contributorAccountsModal) {
      this.showToast('Contributor accounts are already open.');
      return;
    }

    let rows;
    try {
      rows = await apiService.getAllContributors();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to load contributor accounts';
      this.showToast(message);
      return;
    }

    this.renderContributorAccountsModal(rows || []);
  }

  renderContributorAccountsModal(rows) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(960px, calc(100vw - 40px))';
    modal.style.maxHeight = '82vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(42, 23, 19, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    const normalizedRows = Array.isArray(rows) ? rows : [];
    const sortedRows = [...normalizedRows].sort((a, b) =>
      String(a?.fullName || '').localeCompare(String(b?.fullName || ''))
    );

    const rowHtml = sortedRows.map((row) => {
      const contributorId = this.escapeHtml(row?.contributorId || 'Unknown');
      const fullName = this.escapeHtml(row?.fullName || 'Unknown');
      const email = this.escapeHtml(row?.email || 'Unknown');
      const bio = this.escapeHtml(row?.bio || '');
      const isActive = Boolean(row?.isActive);
      const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
      const statusColor = isActive ? '#a7f0c2' : '#ffc7c7';

      return `
        <div style="padding: 12px; border: 1px solid #845042; border-radius: 8px; margin-bottom: 10px; background: rgba(31, 14, 11, 0.72);">
          <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="color: #fff0e8; font-size: 16px; font-weight: bold;">${fullName}</div>
            <div style="color: ${statusColor}; font-size: 13px;">${statusText}</div>
          </div>
          <div style="margin-top: 4px; color: #f0c1aa; font-size: 13px;">Email: ${email}</div>
          <div style="margin-top: 4px; color: #dca892; font-size: 12px;">Contributor ID: ${contributorId}</div>
          <div style="margin-top: 8px; color: #ffe7dc; font-size: 13px; line-height: 1.4;">${bio || 'No bio provided.'}</div>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #ffe8dc;">Contributor Accounts</h2>
        <button type="button" id="close-contributor-accounts-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="margin-bottom: 12px; color: #efb9a2;">Total contributors: ${sortedRows.length}</div>
      <div>
        ${sortedRows.length ? rowHtml : '<div style="color: #ffe7dc;">No contributors found.</div>'}
      </div>
    `;

    document.body.appendChild(modal);
    this.contributorAccountsModal = modal;
    this.updateSceneInputInteractivity();

    const closeBtn = modal.querySelector('#close-contributor-accounts-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyContributorAccountsModal();
    });
  }

  async openTelemetryWorkflow() {
    if (this.telemetryModal) {
      this.showToast('Telemetry dashboard is already open.');
      return;
    }

    let maps = [];
    let dashboard;
    try {
      [maps, dashboard] = await Promise.all([
        apiService.getAllMaps().catch(() => []),
        apiService.getEncounterTelemetryDashboard()
      ]);
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to load encounter telemetry';
      this.showToast(message);
      return;
    }

    this.renderTelemetryModal(maps || [], dashboard || null);
  }

  renderTelemetryModal(maps, dashboard) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(980px, calc(100vw - 40px))';
    modal.style.maxHeight = '84vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(42, 23, 19, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    const mapOptions = [
      '<option value="">All Maps</option>',
      ...(Array.isArray(maps) ? maps : []).map((map) => {
        const id = this.escapeHtml(map?.mapId || map?.id || '');
        const name = this.escapeHtml(map?.name || 'Unnamed Map');
        return `<option value="${id}">${name}</option>`;
      })
    ].join('');

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #ffe8dc;">Encounter Telemetry</h2>
        <button type="button" id="close-telemetry-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 12px;">
        <label for="telemetry-map-select" style="color: #f3c7b3; font-size: 13px;">Scope</label>
        <select id="telemetry-map-select" style="padding: 8px 10px; background: #23120f; color: #ffe8dc; border: 1px solid #845042; border-radius: 6px; min-width: 240px;">
          ${mapOptions}
        </select>
        <button type="button" id="telemetry-refresh-btn" style="padding: 8px 12px; background: #2a2218; color: #fff0e8; border: 1px solid #c8870a; border-radius: 6px; cursor: pointer;">
          Refresh
        </button>
      </div>
      <div id="telemetry-status" style="min-height: 18px; margin-bottom: 12px; color: #ffd4a6;"></div>
      <div id="telemetry-content">${this.renderTelemetryCards(dashboard)}</div>
    `;

    document.body.appendChild(modal);
    this.telemetryModal = modal;
    this.updateSceneInputInteractivity();

    const closeBtn = modal.querySelector('#close-telemetry-btn');
    const refreshBtn = modal.querySelector('#telemetry-refresh-btn');
    const mapSelect = modal.querySelector('#telemetry-map-select');
    const statusEl = modal.querySelector('#telemetry-status');
    const contentEl = modal.querySelector('#telemetry-content');

    const setStatus = (message, color = '#ffd4a6') => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.style.color = color;
    };

    const setControlsEnabled = (enabled) => {
      if (refreshBtn) {
        refreshBtn.disabled = !enabled;
        refreshBtn.style.opacity = enabled ? '1' : '0.6';
        refreshBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
      }
      if (mapSelect) {
        mapSelect.disabled = !enabled;
        mapSelect.style.opacity = enabled ? '1' : '0.7';
      }
    };

    const refreshDashboard = async () => {
      const mapId = mapSelect?.value || null;
      setStatus('Refreshing telemetry...', '#ffd4a6');
      setControlsEnabled(false);
      try {
        const data = await apiService.getEncounterTelemetryDashboard(mapId || null);
        if (contentEl) contentEl.innerHTML = this.renderTelemetryCards(data);
        setStatus('Telemetry updated.', '#a7f0c2');
      } catch (e) {
        const message =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          'Telemetry refresh failed';
        setStatus(message, '#ffc7c7');
      } finally {
        setControlsEnabled(true);
      }
    };

    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyTelemetryModal();
    });
    refreshBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void refreshDashboard();
    });
    mapSelect?.addEventListener('change', () => {
      void refreshDashboard();
    });
  }

  renderTelemetryCards(data) {
    const dashboard = data || {};
    const countRows = [
      ['Map Entered', dashboard.mapEntered],
      ['NPC Interacted', dashboard.npcInteracted],
      ['Monster Unlocked', dashboard.monsterUnlocked],
      ['Combat Started', dashboard.combatStarted],
      ['Combat Won', dashboard.combatWon],
      ['Combat Lost', dashboard.combatLost],
      ['Reward Claimed', dashboard.rewardClaimed]
    ];
    const rateRows = [
      ['Talk Rate', dashboard.talkRate],
      ['Unlock Rate', dashboard.unlockRate],
      ['Win Rate', dashboard.winRate],
      ['Loss Rate', dashboard.lossRate],
      ['Reward Claim Rate', dashboard.rewardClaimRate]
    ];

    const countHtml = countRows.map(([label, value]) => `
      <div style="display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(132,80,66,0.35);">
        <span style="color: #f3c7b3;">${this.escapeHtml(label)}</span>
        <span style="color: #fff0e8; font-weight: bold;">${this.formatMetric(value)}</span>
      </div>
    `).join('');

    const rateHtml = rateRows.map(([label, value]) => `
      <div style="display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(132,80,66,0.35);">
        <span style="color: #f3c7b3;">${this.escapeHtml(label)}</span>
        <span style="color: #a7f0c2; font-weight: bold;">${this.formatPercent(value)}</span>
      </div>
    `).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px;">
        <div style="padding: 12px; border: 1px solid #845042; border-radius: 8px; background: rgba(31, 14, 11, 0.72);">
          <div style="color: #ffe8dc; font-weight: bold; margin-bottom: 8px;">Funnel Counts</div>
          ${countHtml}
        </div>
        <div style="padding: 12px; border: 1px solid #845042; border-radius: 8px; background: rgba(31, 14, 11, 0.72);">
          <div style="color: #ffe8dc; font-weight: bold; margin-bottom: 8px;">Conversion Rates</div>
          ${rateHtml}
        </div>
      </div>
    `;
  }

  formatMetric(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return Math.round(num).toLocaleString();
  }

  formatPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.00%';
    return `${num.toFixed(2)}%`;
  }

  createActionCard(x, y, w, h, title, subtitle, onClick) {
    const c = this.add.container(x - w / 2, y - h / 2);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);
      bg.fillStyle(0xffffff, 0.05);
      bg.fillRoundedRect(2, 2, w - 4, h * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(0x4a2218, 0xd49a83);
    c.add(bg);
    c.add(this.add.text(w / 2, 42, title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff0e8',
      stroke: '#240d09',
      strokeThickness: 4
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, 92, subtitle, {
      fontSize: '14px',
      color: '#f3c7b3',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(0x643125, 0xf0bea8));
    hit.on('pointerout', () => draw(0x4a2218, 0xd49a83));
    hit.on('pointerdown', () => draw(0x32140f, 0xbd7e61));
    hit.on('pointerup', async () => {
      draw(0x643125, 0xf0bea8);
      try {
        await onClick();
      } catch (e) {
        this.showToast(e?.message || 'Action failed');
      }
    });
  }

  createButton(x, y, w, h, label, onClick, normal, hover) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };

    draw(normal, 0xc8870a);
    c.add(bg);
    c.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fff3ed',
      stroke: '#210e0a',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(hover, 0xf0b030));
    hit.on('pointerout', () => draw(normal, 0xc8870a));
    hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
    hit.on('pointerup', onClick);
  }

  async openReviewQueueWorkflow() {
    if (this.reviewQueueModal) {
      this.showToast('Review queue is already open.');
      return;
    }

    let rows;
    try {
      rows = await apiService.getContentQueue();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to load review queue';
      this.showToast(message);
      return;
    }

    await this.renderReviewQueueModal(rows || []);
  }

  async renderReviewQueueModal(rows) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(960px, calc(100vw - 40px))';
    modal.style.maxHeight = '82vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(42, 23, 19, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #ffe8dc;">Pending Review Queue</h2>
        <button type="button" id="close-review-queue-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="color: #efb9a2;">Loading pending content...</div>
    `;

    document.body.appendChild(modal);
    this.reviewQueueModal = modal;
    this.updateSceneInputInteractivity();

    const earlyCloseBtn = modal.querySelector('#close-review-queue-btn');
    earlyCloseBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyReviewQueueModal();
    });

    const sortedRows = [...rows].sort((a, b) => {
      const at = new Date(a?.submittedAt || 0).getTime();
      const bt = new Date(b?.submittedAt || 0).getTime();
      return bt - at;
    });

    const contributorMap = {};

    const rowHtmlPromises = sortedRows.map(async (row) => {
      const contentId = this.escapeHtml(row?.contentId || '');
      const title = this.escapeHtml(row?.title || 'Untitled');
      const topicName = this.escapeHtml(row?.topic?.topicName || 'Unknown Topic');
      const contributorId = row?.contributorId;
      
      let contributorName = 'Unknown';
      
      if (contributorId) {
        try {
          const contributor = await apiService.getContributor(contributorId);
          if (contributor) {
            contributorMap[contributorId] = contributor;
            contributorName = contributor.fullName || 'Unknown';
          }
        } catch (e) {
          console.warn('Unable to load contributor details', e);
        }
      }
      
      const safeContributorId = this.escapeHtml(contributorId || 'Unknown');
      const safeContributorName = this.escapeHtml(contributorName);
      const submittedAt = this.escapeHtml(this.formatDate(row?.submittedAt));
      const preview = this.escapeHtml(this.previewText(row?.body, 260));

      return `
        <div data-row-id="${contentId}" style="padding: 12px; border: 1px solid #845042; border-radius: 8px; margin-bottom: 10px; background: rgba(31, 14, 11, 0.72);">
          <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="color: #fff0e8; font-size: 16px; font-weight: bold;">${title}</div>
            <div style="color: #ffd4a6; font-size: 13px;">PENDING_REVIEW</div>
          </div>
          <div style="margin-top: 4px; color: #f0c1aa; font-size: 13px;">Topic: ${topicName}</div>
          <div style="margin-top: 4px; color: #dca892; font-size: 12px;">Contributor: 
            <a href="#" data-action="view-contributor" data-contributor-id="${safeContributorId}" style="color: #a7f0c2; text-decoration: underline; font-weight: bold; cursor: pointer;">
              ${safeContributorName}
            </a>
          </div>
          <div style="margin-top: 4px; color: #dca892; font-size: 12px;">Submitted: ${submittedAt}</div>
          <div style="margin-top: 4px; color: #dca892; font-size: 12px;">ID: ${contentId}</div>
          <div style="margin-top: 8px; color: #ffe7dc; font-size: 13px; line-height: 1.4;">${preview}</div>
          <div style="display: flex; gap: 10px; margin-top: 12px;">
            <button type="button" data-action="approve" data-content-id="${contentId}" style="padding: 8px 14px; background: #1f6d34; color: #f5fff8; border: 1px solid #5ec38a; border-radius: 6px; cursor: pointer; font-weight: bold;">
              Approve
            </button>
            <button type="button" data-action="reject" data-content-id="${contentId}" style="padding: 8px 14px; background: #712020; color: #fff0f0; border: 1px solid #d88383; border-radius: 6px; cursor: pointer; font-weight: bold;">
              Reject
            </button>
          </div>
        </div>
      `;
    });

    const rowHtmlArray = await Promise.all(rowHtmlPromises);
    const rowHtml = rowHtmlArray.join('');

    if (!this.reviewQueueModal) return;

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #ffe8dc;">Pending Review Queue</h2>
        <button type="button" id="close-review-queue-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div id="review-queue-count" style="margin-bottom: 12px; color: #efb9a2;">Total pending: ${sortedRows.length}</div>
      <div id="review-queue-status" style="margin-bottom: 12px; min-height: 18px; color: #ffd4a6;"></div>
      <div id="review-queue-list">
        ${sortedRows.length ? rowHtml : '<div style="color: #ffe7dc;">No content is pending review.</div>'}
      </div>
    `;


    const closeBtn = modal.querySelector('#close-review-queue-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyReviewQueueModal();
    });

    const contributorLinks = modal.querySelectorAll('a[data-action="view-contributor"]');
    contributorLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const cid = link.getAttribute('data-contributor-id');
        const contributorInfo = contributorMap[cid];
        if (contributorInfo) {
          this.renderContributorDetailsModal(contributorInfo);
        } else {
          this.showToast('Contributor details not found.');
        }
      });
    });


    const actionButtons = modal.querySelectorAll('button[data-action]');
    actionButtons.forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const action = button.getAttribute('data-action');
        const contentId = button.getAttribute('data-content-id');
        if (!action || !contentId) return;

        this.setReviewQueueStatus(`${action === 'approve' ? 'Approving' : 'Rejecting'} content...`, '#ffd4a6');
        this.setReviewActionButtonsEnabled(false);

        try {
          if (action === 'approve') {
            await apiService.approveContent(contentId);
            this.showToast('Content approved.');
          } else {
            await apiService.rejectContent(contentId);
            this.showToast('Content rejected.');
          }
          const rowEl = modal.querySelector(`[data-row-id="${this.escapeCssSelector(contentId)}"]`);
          rowEl?.remove();
          const remaining = modal.querySelectorAll('[data-row-id]').length;
          const list = modal.querySelector('#review-queue-list');
          if (remaining === 0 && list) {
            list.innerHTML = '<div style="color: #ffe7dc;">No content is pending review.</div>';
          }
          this.updatePendingCount(remaining);
          this.setReviewQueueStatus('Action completed.', '#a7f0c2');
        } catch (e) {
          const message =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            'Moderation action failed';
          this.setReviewQueueStatus(message, '#ffc7c7');
        } finally {
          this.setReviewActionButtonsEnabled(true);
        }
      });
    });
  }

  renderContributorDetailsModal(contributor) {
    if (this.contributorDetailsModal) {
       this.destroyContributorDetailsModal();
    }

    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(500px, calc(100vw - 40px))';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(28, 15, 12, 0.98)';
    modal.style.border = '2px solid #5ec38a'; 
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.8)';
    modal.style.zIndex = '1001'; 

    const fullName = this.escapeHtml(contributor.fullName || 'Unknown');
    const email = this.escapeHtml(contributor.email || 'Unknown');
    const bio = this.escapeHtml(contributor.bio || 'No bio provided.');
    const contributorId = this.escapeHtml(contributor.contributorId || 'Unknown');
    const supabaseUserId = this.escapeHtml(contributor.supabaseUserId || 'Unknown');
    const createdAt = this.escapeHtml(this.formatDate(contributor.createdAt));
    const updatedAt = this.escapeHtml(this.formatDate(contributor.updatedAt));
    const isActive = Boolean(contributor.isActive);
    const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
    const statusColor = isActive ? '#a7f0c2' : '#ffc7c7';

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
        <h2 style="margin: 0; color: #ffe8dc;">Contributor Details</h2>
        <button type="button" id="close-contributor-details-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="color: #fff0e8; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
        ${fullName} <span style="font-size: 12px; color: ${statusColor}; margin-left: 8px; vertical-align: middle;">${statusText}</span>
      </div>
      <div style="margin-bottom: 6px; color: #f0c1aa; font-size: 14px;"><strong>Email:</strong> ${email}</div>
      <div style="margin-bottom: 6px; color: #dca892; font-size: 13px;"><strong>Contributor ID:</strong> ${contributorId}</div>
      <div style="margin-bottom: 6px; color: #dca892; font-size: 13px;"><strong>Supabase User ID:</strong> ${supabaseUserId}</div>
      <div style="margin-bottom: 6px; color: #dca892; font-size: 13px;"><strong>Created At:</strong> ${createdAt}</div>
      <div style="margin-bottom: 12px; color: #dca892; font-size: 13px;"><strong>Updated At:</strong> ${updatedAt}</div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #845042; color: #ffe7dc; font-size: 14px; line-height: 1.5;">
        <strong>Bio:</strong><br/>
        ${bio}
      </div>
    `;

    document.body.appendChild(modal);
    this.contributorDetailsModal = modal;
    this.updateSceneInputInteractivity();

    const closeBtn = modal.querySelector('#close-contributor-details-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyContributorDetailsModal();
    });
  }


  updatePendingCount(count) {
    if (!this.reviewQueueModal) return;
    const summary = this.reviewQueueModal.querySelector('#review-queue-count');
    if (summary) {
      summary.textContent = `Total pending: ${count}`;
    }
  }

  setReviewQueueStatus(message, color = '#ffd4a6') {
    if (!this.reviewQueueModal) return;
    const statusEl = this.reviewQueueModal.querySelector('#review-queue-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  }

  setReviewActionButtonsEnabled(enabled) {
    if (!this.reviewQueueModal) return;
    const buttons = this.reviewQueueModal.querySelectorAll('button[data-action]');
    buttons.forEach((button) => {
      button.disabled = !enabled;
      button.style.opacity = enabled ? '1' : '0.6';
      button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
  }

  destroyReviewQueueModal() {
    if (this.reviewQueueModal && this.reviewQueueModal.parentNode) {
      this.reviewQueueModal.parentNode.removeChild(this.reviewQueueModal);
    }
    this.reviewQueueModal = null;
    this.updateSceneInputInteractivity();
  }

  destroyContributorAccountsModal() {
    if (this.contributorAccountsModal && this.contributorAccountsModal.parentNode) {
      this.contributorAccountsModal.parentNode.removeChild(this.contributorAccountsModal);
    }
    this.contributorAccountsModal = null;
    this.updateSceneInputInteractivity();
  }

  destroyTelemetryModal() {
    if (this.telemetryModal && this.telemetryModal.parentNode) {
      this.telemetryModal.parentNode.removeChild(this.telemetryModal);
    }
    this.telemetryModal = null;
    this.updateSceneInputInteractivity();
  }

  destroyContributorDetailsModal() {
    if (this.contributorDetailsModal && this.contributorDetailsModal.parentNode) {
      this.contributorDetailsModal.parentNode.removeChild(this.contributorDetailsModal);
    }
    this.contributorDetailsModal = null;
    this.updateSceneInputInteractivity();
  }

  updateSceneInputInteractivity() {
    this.input.enabled =
      !this.reviewQueueModal &&
      !this.flagQueueModal &&
      !this.contributorAccountsModal &&
      !this.telemetryModal &&
      !this.contributorDetailsModal;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeCssSelector(value) {
    return String(value).replace(/["\\]/g, '\\$&');
  }

  previewText(value, maxLength) {
    if (!value) return '';
    const normalized = String(value).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
  }

  formatDate(value) {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  showToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#3b1e17',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 10,
      duration: 1400,
      onComplete: () => text.destroy()
    });
  }

  async openFlagQueueWorkflow() {
    if (this.flagQueueModal) {
      this.showToast('Flag queue is already open.');
      return;
    }

    let rows;
    try {
      rows = await apiService.getOpenContentFlags();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to load content flags';
      this.showToast(message);
      return;
    }

    this.renderFlagQueueModal(rows || []);
  }

  renderFlagQueueModal(rows) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(980px, calc(100vw - 40px))';
    modal.style.maxHeight = '84vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(42, 23, 19, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    const sortedRows = [...rows].sort((a, b) => {
      const at = new Date(a?.createdAt || 0).getTime();
      const bt = new Date(b?.createdAt || 0).getTime();
      return bt - at;
    });

    const rowHtml = sortedRows.map((row) => {
      const flagId = this.escapeHtml(row?.contentFlagId || '');
      const contentId = this.escapeHtml(row?.content?.contentId || 'Unknown');
      const title = this.escapeHtml(row?.content?.title || 'Untitled');
      const topicName = this.escapeHtml(row?.content?.topic?.topicName || 'Unknown Topic');
      const reportedBy = this.escapeHtml(
        row?.reportedBy?.username ||
        row?.reportedBy?.learnerId ||
        'Unknown learner'
      );
      const createdAt = this.escapeHtml(this.formatDate(row?.createdAt));
      const reason = this.escapeHtml(row?.reason || 'UNKNOWN');
      const details = this.escapeHtml(row?.details || 'No additional details.');

      return `
        <div data-flag-row-id="${flagId}" style="padding: 12px; border: 1px solid #845042; border-radius: 8px; margin-bottom: 10px; background: rgba(31, 14, 11, 0.72);">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="color:#fff0e8; font-size:16px; font-weight:bold;">${title}</div>
            <div style="color:#ffd4a6; font-size:13px;">${reason}</div>
          </div>
          <div style="margin-top:4px; color:#f0c1aa; font-size:13px;">Topic: ${topicName}</div>
          <div style="margin-top:4px; color:#dca892; font-size:12px;">Content ID: ${contentId}</div>
          <div style="margin-top:4px; color:#dca892; font-size:12px;">Reported By: ${reportedBy}</div>
          <div style="margin-top:4px; color:#dca892; font-size:12px;">Reported At: ${createdAt}</div>
          <div style="margin-top:8px; color:#ffe7dc; font-size:13px; line-height:1.4;">${details}</div>

          <textarea
            data-flag-notes="${flagId}"
            rows="3"
            placeholder="Resolution notes"
            style="width:100%; margin-top:12px; padding:10px; border-radius:6px; border:1px solid #845042; background:#23120f; color:#fff0e8; resize:vertical;"
          ></textarea>

          <div style="display:flex; gap:10px; margin-top:12px;">
            <button type="button" data-flag-action="review" data-flag-id="${flagId}" style="padding:8px 14px; background:#1f6d34; color:#f5fff8; border:1px solid #5ec38a; border-radius:6px; cursor:pointer; font-weight:bold;">
              Mark Reviewed
            </button>
            <button type="button" data-flag-action="dismiss" data-flag-id="${flagId}" style="padding:8px 14px; background:#712020; color:#fff0f0; border:1px solid #d88383; border-radius:6px; cursor:pointer; font-weight:bold;">
              Dismiss
            </button>
          </div>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
        <h2 style="margin:0; color:#ffe8dc;">Open Content Flags</h2>
        <button type="button" id="close-flag-queue-btn" style="padding:10px 14px; background:#4a1111; color:#ffe9e9; border:1px solid #ab6666; border-radius:6px; cursor:pointer;">
          Close
        </button>
      </div>
      <div id="flag-queue-count" style="margin-bottom:12px; color:#efb9a2;">Total open flags: ${sortedRows.length}</div>
      <div id="flag-queue-status" style="margin-bottom:12px; min-height:18px; color:#ffd4a6;"></div>
      <div id="flag-queue-list">
        ${sortedRows.length ? rowHtml : '<div style="color:#ffe7dc;">No open content flags.</div>'}
      </div>
    `;

    document.body.appendChild(modal);
    this.flagQueueModal = modal;
    this.updateSceneInputInteractivity();

    const closeBtn = modal.querySelector('#close-flag-queue-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyFlagQueueModal();
    });

    const actionButtons = modal.querySelectorAll('button[data-flag-action]');
    actionButtons.forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const action = button.getAttribute('data-flag-action');
        const flagId = button.getAttribute('data-flag-id');
        if (!action || !flagId) return;

        const notesEl = modal.querySelector(`[data-flag-notes="${this.escapeCssSelector(flagId)}"]`);
        const resolutionNotes = notesEl?.value?.trim() || '';
        const status = action === 'review' ? 'REVIEWED' : 'DISMISSED';

        if (status === 'DISMISSED' && !resolutionNotes) {
          this.setFlagQueueStatus('Resolution notes are required to dismiss a flag.', '#ffc7c7');
          return;
        }

        this.setFlagQueueStatus(
          status === 'REVIEWED' ? 'Marking flag as reviewed...' : 'Dismissing flag...',
          '#ffd4a6'
        );
        this.setFlagActionButtonsEnabled(false);

        try {
          await apiService.reviewContentFlag(flagId, {
            status,
            resolutionNotes: resolutionNotes || null
          });

          const rowEl = modal.querySelector(`[data-flag-row-id="${this.escapeCssSelector(flagId)}"]`);
          rowEl?.remove();

          const remaining = modal.querySelectorAll('[data-flag-row-id]').length;
          const list = modal.querySelector('#flag-queue-list');
          if (remaining === 0 && list) {
            list.innerHTML = '<div style="color:#ffe7dc;">No open content flags.</div>';
          }

          this.updateFlagPendingCount(remaining);
          this.setFlagQueueStatus('Flag updated.', '#a7f0c2');
          this.showToast(status === 'REVIEWED' ? 'Flag marked reviewed.' : 'Flag dismissed.');
        } catch (e) {
          const message =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            'Flag action failed';
          this.setFlagQueueStatus(message, '#ffc7c7');
        } finally {
          this.setFlagActionButtonsEnabled(true);
        }
      });
    });
  }

  updateFlagPendingCount(count) {
    if (!this.flagQueueModal) return;
    const summary = this.flagQueueModal.querySelector('#flag-queue-count');
    if (summary) {
      summary.textContent = `Total open flags: ${count}`;
    }
  }

  setFlagQueueStatus(message, color = '#ffd4a6') {
    if (!this.flagQueueModal) return;
    const statusEl = this.flagQueueModal.querySelector('#flag-queue-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  }

  setFlagActionButtonsEnabled(enabled) {
    if (!this.flagQueueModal) return;
    const buttons = this.flagQueueModal.querySelectorAll('button[data-flag-action]');
    const textareas = this.flagQueueModal.querySelectorAll('textarea[data-flag-notes]');
    buttons.forEach((button) => {
      button.disabled = !enabled;
      button.style.opacity = enabled ? '1' : '0.6';
      button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
    textareas.forEach((textarea) => {
      textarea.disabled = !enabled;
      textarea.style.opacity = enabled ? '1' : '0.7';
    });
  }

  destroyFlagQueueModal() {
    if (this.flagQueueModal && this.flagQueueModal.parentNode) {
      this.flagQueueModal.parentNode.removeChild(this.flagQueueModal);
    }
    this.flagQueueModal = null;
    this.updateSceneInputInteractivity();
  }

}
