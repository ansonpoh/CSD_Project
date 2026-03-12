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
    this.questionBankModal = null;
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
    const panelH = 580;
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
    const y = panelY + 116;

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

    this.createActionCard(width / 2, y + cardH + 28, cardW, cardH, 'Question Bank', 'Manage map question banks', async () => {
      await this.openQuestionBankWorkflow();
    });

    this.createButton(width / 2 - 90, panelY + panelH - 60, 180, 42, 'Logout', async () => {
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
      this.destroyTelemetryModal();
      this.destroyContributorDetailsModal();
      this.destroyQuestionBankModal();
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
      this.destroyQuestionBankModal();
    });
    this.events.once('destroy', () => {
      this.destroyFlagQueueModal();
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
      this.destroyTelemetryModal();
      this.destroyContributorDetailsModal();
      this.destroyQuestionBankModal();
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
      !this.contributorDetailsModal &&
      !this.questionBankModal;
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

  // --- Question Bank ---

  async openQuestionBankWorkflow() {
    if (this.questionBankModal) {
      this.showToast('Question Bank is already open.');
      return;
    }
    let maps;
    try {
      maps = await apiService.getAllMaps();
    } catch (e) {
      this.showToast(e?.response?.data?.message || e?.message || 'Unable to load maps');
      return;
    }
    this.renderQuestionBankModal(maps || []);
  }

  renderQuestionBankModal(maps) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(1000px, calc(100vw - 40px))';
    modal.style.maxHeight = '85vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(42, 23, 19, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    const mapOptions = maps.map(m =>
      `<option value="${this.escapeHtml(m.mapId)}">${this.escapeHtml(m.name)}</option>`
    ).join('');

    const selectStyle = `background:#1f0e0b; color:#ffe8dc; border:1px solid #845042; border-radius:4px; padding:6px 10px; font-size:13px; min-width:160px;`;
    const btnPrimary = `background:#4a2800; color:#ffd4a6; border:1px solid #c8870a; border-radius:6px; padding:8px 16px; cursor:pointer; font-size:13px;`;
    const btnDanger = `background:#4a1111; color:#ffc7c7; border:1px solid #ab6666; border-radius:6px; padding:8px 14px; cursor:pointer; font-size:13px;`;
    const tabActive = `padding:8px 20px; background:#4a2800; color:#ffd4a6; border:1px solid #c8870a; border-bottom:none; border-radius:6px 6px 0 0; cursor:pointer; font-size:13px; margin-bottom:-1px;`;
    const tabInactive = `padding:8px 20px; background:transparent; color:#efb9a2; border:1px solid transparent; border-bottom:1px solid #845042; border-radius:6px 6px 0 0; cursor:pointer; font-size:13px; margin-bottom:-1px;`;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
        <h2 style="margin:0; color:#ffe8dc;">Question Bank</h2>
        <button id="bank-close-btn" style="${btnDanger}">Close</button>
      </div>
      <div style="display:flex; gap:0; margin-bottom:16px; border-bottom:1px solid #845042;">
        <button id="bank-tab-gen" style="${tabActive}">Generate Questions</button>
        <button id="bank-tab-view" style="${tabInactive}">View Bank</button>
      </div>
      <div id="bank-status" style="min-height:18px; font-size:13px; margin-bottom:12px;"></div>

      <div id="bank-panel-gen">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
          <label style="color:#efb9a2; font-size:13px;">Select Map:</label>
          <select id="bank-map-select" style="${selectStyle}">
            <option value="">-- Choose a map --</option>
            ${mapOptions}
          </select>
          <button id="bank-gen-btn" style="${btnPrimary}">Generate Draft</button>
          <button id="bank-manual-add-btn" style="background:transparent; color:#c8870a; border:1px dashed #c8870a; border-radius:6px; padding:8px 14px; cursor:pointer; font-size:13px;" title="Add a blank question without AI">+ Add Manually</button>
        </div>
        <div id="bank-draft-area" style="display:none;">
          <div style="color:#efb9a2; font-size:12px; margin-bottom:12px;">Review and edit the generated questions. Check boxes mark correct answers.</div>
          <div id="bank-draft-questions"></div>
          <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <button id="bank-add-q-btn" style="background:transparent; color:#c8870a; border:1px dashed #c8870a; border-radius:6px; padding:8px 18px; cursor:pointer; font-size:13px;">+ Add Question</button>
            <button id="bank-save-btn" style="${btnPrimary}">Save All to Bank</button>
          </div>
        </div>
      </div>

      <div id="bank-panel-view" style="display:none;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px; flex-wrap:wrap;">
          <label style="color:#efb9a2; font-size:13px;">Map:</label>
          <select id="bank-view-map" style="${selectStyle}">
            <option value="">All Maps</option>
            ${mapOptions}
          </select>
          <label style="color:#efb9a2; font-size:13px;">Status:</label>
          <select id="bank-view-status" style="${selectStyle}">
            <option value="">All</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button id="bank-view-load-btn" style="${btnPrimary}">Load</button>
        </div>
        <div id="bank-view-count" style="color:#efb9a2; font-size:13px; margin-bottom:10px;"></div>
        <div id="bank-view-list"></div>
      </div>
    `;

    document.body.appendChild(modal);
    this.questionBankModal = modal;
    this.updateSceneInputInteractivity();

    // Helper: build an option row element
    const buildOptionRowEl = (optionText, isCorrect) => {
      const div = document.createElement('div');
      div.setAttribute('data-opt-row', '');
      div.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:6px;';
      div.innerHTML = `
        <input type="checkbox" data-opt-correct ${isCorrect ? 'checked' : ''} style="flex-shrink:0; width:16px; height:16px; accent-color:#c8870a; cursor:pointer;">
        <input type="text" data-opt-text value="${this.escapeHtml(optionText || '')}" placeholder="Option text..." style="flex:1; background:#1f0e0b; color:#ffe8dc; border:1px solid #845042; border-radius:4px; padding:6px 8px; font-size:12px;">
        <button data-remove-opt style="background:#4a1111; color:#ffc7c7; border:1px solid #ab6666; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:11px; flex-shrink:0;">✕</button>
      `;
      div.querySelector('[data-remove-opt]').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        div.remove();
      });
      return div;
    };

    // Helper: build a draft question card element
    const buildDraftQuestionEl = (idx, q) => {
      const card = document.createElement('div');
      card.setAttribute('data-q-card', '');
      card.style.cssText = 'border:1px solid #845042; border-radius:8px; padding:14px; margin-bottom:12px; background:rgba(31,14,11,0.72); position:relative;';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="color:#c8870a; font-weight:bold; font-size:14px;" data-q-label>Q${idx + 1}</div>
          <button data-remove-q style="background:#4a1111; color:#ffc7c7; border:1px solid #ab6666; border-radius:4px; padding:3px 10px; cursor:pointer; font-size:12px;">✕ Remove</button>
        </div>
        <textarea data-q-text style="width:100%; min-height:72px; background:#1f0e0b; color:#ffe8dc; border:1px solid #845042; border-radius:4px; padding:8px; font-size:13px; resize:vertical; box-sizing:border-box;">${this.escapeHtml(q.scenarioText || '')}</textarea>
        <div style="color:#efb9a2; font-size:12px; margin:8px 0 4px;">Options — check the correct answer(s):</div>
        <div data-opts-container></div>
        <button data-add-opt style="margin-top:6px; background:transparent; color:#c8870a; border:1px dashed #c8870a; border-radius:4px; padding:4px 12px; cursor:pointer; font-size:12px;">+ Add Option</button>
      `;
      const optsContainer = card.querySelector('[data-opts-container]');
      (q.options || []).forEach(opt => optsContainer.appendChild(buildOptionRowEl(opt.optionText, opt.isCorrect)));
      card.querySelector('[data-add-opt]').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        optsContainer.appendChild(buildOptionRowEl('', false));
      });
      card.querySelector('[data-remove-q]').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        card.remove();
        renumberQuestions();
      });
      return card;
    };

    const renumberQuestions = () => {
      draftQuestionsEl.querySelectorAll('[data-q-card]').forEach((card, i) => {
        const label = card.querySelector('[data-q-label]');
        if (label) label.textContent = `Q${i + 1}`;
      });
    };

    // Tab switching
    const tabGen = modal.querySelector('#bank-tab-gen');
    const tabView = modal.querySelector('#bank-tab-view');
    const panelGen = modal.querySelector('#bank-panel-gen');
    const panelView = modal.querySelector('#bank-panel-view');

    tabGen.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      tabGen.style.cssText = tabActive;
      tabView.style.cssText = tabInactive;
      panelGen.style.display = 'block';
      panelView.style.display = 'none';
    });
    tabView.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      tabView.style.cssText = tabActive;
      tabGen.style.cssText = tabInactive;
      panelView.style.display = 'block';
      panelGen.style.display = 'none';
    });

    // Close
    modal.querySelector('#bank-close-btn').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.destroyQuestionBankModal();
    });

    // Generate Draft
    const genBtn = modal.querySelector('#bank-gen-btn');
    const mapSelect = modal.querySelector('#bank-map-select');
    const draftArea = modal.querySelector('#bank-draft-area');
    const draftQuestionsEl = modal.querySelector('#bank-draft-questions');

    genBtn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const mapId = mapSelect.value;
      if (!mapId) { this.setBankStatus('Please select a map first.', '#ffc7c7'); return; }
      genBtn.disabled = true;
      genBtn.style.opacity = '0.6';
      genBtn.textContent = 'Generating...';
      draftArea.style.display = 'none';
      this.setBankStatus('AI is generating questions — this may take a few seconds...', '#ffd4a6');
      try {
        const draft = await apiService.generateBankDraft(mapId);
        draftQuestionsEl.innerHTML = '';
        draft.forEach((q, idx) => draftQuestionsEl.appendChild(buildDraftQuestionEl(idx, q)));
        draftArea.style.display = 'block';
        this.setBankStatus(`Generated ${draft.length} questions. Review and edit below, then save.`, '#a7f0c2');
      } catch (err) {
        this.setBankStatus(err?.response?.data?.message || err?.message || 'Generation failed', '#ffc7c7');
      } finally {
        genBtn.disabled = false;
        genBtn.style.opacity = '1';
        genBtn.textContent = 'Generate Draft';
      }
    });

    // Add Question (from bottom of draft list)
    modal.querySelector('#bank-add-q-btn').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const idx = draftQuestionsEl.querySelectorAll('[data-q-card]').length;
      draftQuestionsEl.appendChild(buildDraftQuestionEl(idx, { scenarioText: '', options: [{ optionText: '', isCorrect: false }] }));
    });

    // Add Manually (top-level button — shows draft area and adds a blank question)
    modal.querySelector('#bank-manual-add-btn').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      draftArea.style.display = 'block';
      const idx = draftQuestionsEl.querySelectorAll('[data-q-card]').length;
      draftQuestionsEl.appendChild(buildDraftQuestionEl(idx, { scenarioText: '', options: [{ optionText: '', isCorrect: false }] }));
      this.setBankStatus('Blank question added. Fill in the scenario and options.', '#ffd4a6');
    });

    // Save to Bank
    modal.querySelector('#bank-save-btn').addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const mapId = mapSelect.value;
      if (!mapId) { this.setBankStatus('No map selected.', '#ffc7c7'); return; }
      const questions = [];
      draftQuestionsEl.querySelectorAll('[data-q-card]').forEach(qEl => {
        const scenarioText = qEl.querySelector('[data-q-text]').value.trim();
        const options = [];
        qEl.querySelectorAll('[data-opt-row]').forEach(optEl => {
          const optionText = optEl.querySelector('[data-opt-text]').value.trim();
          const isCorrect = optEl.querySelector('[data-opt-correct]').checked;
          if (optionText) options.push({ optionText, isCorrect });
        });
        if (scenarioText && options.length > 0) questions.push({ scenarioText, options });
      });
      if (questions.length === 0) { this.setBankStatus('No valid questions to save.', '#ffc7c7'); return; }
      const saveBtn = modal.querySelector('#bank-save-btn');
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.6';
      this.setBankStatus('Saving to bank...', '#ffd4a6');
      try {
        const saved = await apiService.saveBankQuestions(mapId, questions);
        this.setBankStatus(`${saved.length} question(s) saved as Pending Review.`, '#a7f0c2');
        draftArea.style.display = 'none';
        draftQuestionsEl.innerHTML = '';
        this.showToast('Questions saved to bank!');
      } catch (err) {
        this.setBankStatus(err?.response?.data?.message || err?.message || 'Save failed', '#ffc7c7');
      } finally {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      }
    });

    // View Bank: Load
    const viewLoadBtn = modal.querySelector('#bank-view-load-btn');
    const viewMapSelect = modal.querySelector('#bank-view-map');
    const viewStatusSelect = modal.querySelector('#bank-view-status');
    const viewCountEl = modal.querySelector('#bank-view-count');
    const viewListEl = modal.querySelector('#bank-view-list');

    viewLoadBtn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      viewLoadBtn.disabled = true;
      viewLoadBtn.style.opacity = '0.6';
      viewListEl.innerHTML = '';
      viewCountEl.textContent = '';
      this.setBankStatus('Loading questions...', '#ffd4a6');
      try {
        const selectedMapId = viewMapSelect.value;
        const questions = selectedMapId
          ? await apiService.getBankQuestionsByMap(selectedMapId)
          : await apiService.getAllBankQuestions();
        const filterStatus = viewStatusSelect.value;
        const filtered = filterStatus ? questions.filter(q => q.status === filterStatus) : questions;
        viewCountEl.textContent = `Total: ${filtered.length} question${filtered.length !== 1 ? 's' : ''}`;
        if (filtered.length === 0) {
          viewListEl.innerHTML = '<div style="color:#ffe7dc;">No questions found.</div>';
        } else {
          filtered.forEach(q => {
            const statusColor = q.status === 'APPROVED' ? '#a7f0c2' : q.status === 'REJECTED' ? '#ffc7c7' : '#ffd4a6';
            const actionBtns = q.status === 'PENDING_REVIEW' ? `
              <button data-bank-approve="${this.escapeHtml(q.bankQuestionId)}" style="background:#1a3a1a; color:#a7f0c2; border:1px solid #4ca84c; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:12px;">Approve</button>
              <button data-bank-reject="${this.escapeHtml(q.bankQuestionId)}" style="background:#4a1111; color:#ffc7c7; border:1px solid #ab6666; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:12px;">Reject</button>
            ` : '';
            const item = document.createElement('div');
            item.setAttribute('data-bank-q-id', q.bankQuestionId);
            item.style.cssText = 'border:1px solid #845042; border-radius:8px; padding:12px; margin-bottom:10px; background:rgba(31,14,11,0.72);';
            item.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <div style="flex:1; min-width:0;">
                  <div style="color:#ffe8dc; font-size:13px; line-height:1.5;">${this.escapeHtml(this.previewText(q.scenarioText, 240))}</div>
                  <div style="margin-top:6px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                    <span style="color:#efb9a2; font-size:12px;">${this.escapeHtml(q.mapName || '')}</span>
                    <span data-q-status style="color:${statusColor}; font-size:12px; font-weight:bold;">${this.escapeHtml(q.status || '')}</span>
                    <span style="color:#dca892; font-size:11px;">${this.formatDate(q.createdAt)}</span>
                  </div>
                </div>
                <div style="display:flex; gap:6px; flex-shrink:0; align-items:center;">${actionBtns}</div>
              </div>
            `;
            viewListEl.appendChild(item);
          });
        }
        this.setBankStatus('', '');
      } catch (err) {
        this.setBankStatus(err?.response?.data?.message || err?.message || 'Failed to load questions', '#ffc7c7');
      } finally {
        viewLoadBtn.disabled = false;
        viewLoadBtn.style.opacity = '1';
      }
    });

    // View Bank: Approve / Reject via event delegation
    viewListEl.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const target = e.target;
      const bankQuestionId = target.getAttribute('data-bank-approve') || target.getAttribute('data-bank-reject');
      if (!bankQuestionId) return;
      const isApprove = target.hasAttribute('data-bank-approve');
      target.disabled = true;
      target.style.opacity = '0.6';
      this.setBankStatus(isApprove ? 'Approving...' : 'Rejecting...', '#ffd4a6');
      try {
        if (isApprove) {
          await apiService.approveBankQuestion(bankQuestionId);
        } else {
          await apiService.rejectBankQuestion(bankQuestionId);
        }
        const rowEl = viewListEl.querySelector(`[data-bank-q-id="${this.escapeCssSelector(bankQuestionId)}"]`);
        if (rowEl) {
          const newStatus = isApprove ? 'APPROVED' : 'REJECTED';
          const newColor = isApprove ? '#a7f0c2' : '#ffc7c7';
          const statusEl = rowEl.querySelector('[data-q-status]');
          if (statusEl) { statusEl.textContent = newStatus; statusEl.style.color = newColor; }
          rowEl.querySelectorAll('[data-bank-approve],[data-bank-reject]').forEach(btn => btn.remove());
        }
        this.setBankStatus(isApprove ? 'Question approved.' : 'Question rejected.', '#a7f0c2');
        this.showToast(isApprove ? 'Question approved!' : 'Question rejected.');
      } catch (err) {
        this.setBankStatus(err?.response?.data?.message || err?.message || 'Action failed', '#ffc7c7');
        target.disabled = false;
        target.style.opacity = '1';
      }
    });
  }

  setBankStatus(message, color = '#ffd4a6') {
    if (!this.questionBankModal) return;
    const el = this.questionBankModal.querySelector('#bank-status');
    if (!el) return;
    el.textContent = message;
    el.style.color = color;
  }

  destroyQuestionBankModal() {
    if (this.questionBankModal && this.questionBankModal.parentNode) {
      this.questionBankModal.parentNode.removeChild(this.questionBankModal);
    }
    this.questionBankModal = null;
    this.updateSceneInputInteractivity();
  }

}
