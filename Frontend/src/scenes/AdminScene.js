import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
    this.reviewQueueModal = null;
    this.contributorAccountsModal = null;
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

    const panelW = 940;
    const panelH = 500;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x2a1713, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const cardW = 270;
    const cardH = 150;
    const gap = 26;
    const totalCards = 2;
    const startX = width / 2 - ((cardW * totalCards + gap * (totalCards - 1)) / 2) + cardW / 2;
    const y = panelY + 146;

    this.createActionCard(startX, y, cardW, cardH, 'Review Queue', 'Fetch pending moderation queue', async () => {
      await this.openReviewQueueWorkflow();
    });

    this.createActionCard(startX + cardW + gap, y, cardW, cardH, 'Contributors', 'View contributor accounts', async () => {
      await this.openContributorsWorkflow();
    });

    this.createButton(width / 2 - 90, panelY + panelH - 66, 180, 42, 'Logout', async () => {
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
      await supabase.auth.signOut();
      gameState.clearState();
      this.scene.start('LoginScene');
    }, 0x4a1111, 0x7a1b1b);

    this.events.once('shutdown', () => {
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
    });
    this.events.once('destroy', () => {
      this.destroyReviewQueueModal();
      this.destroyContributorAccountsModal();
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

    this.renderReviewQueueModal(rows || []);
  }

  renderReviewQueueModal(rows) {
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

    const sortedRows = [...rows].sort((a, b) => {
      const at = new Date(a?.submittedAt || 0).getTime();
      const bt = new Date(b?.submittedAt || 0).getTime();
      return bt - at;
    });

    const rowHtml = sortedRows.map((row) => {
      const contentId = this.escapeHtml(row?.contentId || '');
      const title = this.escapeHtml(row?.title || 'Untitled');
      const topicName = this.escapeHtml(row?.topic?.topicName || 'Unknown Topic');
      const contributorId = this.escapeHtml(row?.contributorId || 'Unknown');
      const submittedAt = this.escapeHtml(this.formatDate(row?.submittedAt));
      const preview = this.escapeHtml(this.previewText(row?.body, 260));

      return `
        <div data-row-id="${contentId}" style="padding: 12px; border: 1px solid #845042; border-radius: 8px; margin-bottom: 10px; background: rgba(31, 14, 11, 0.72);">
          <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="color: #fff0e8; font-size: 16px; font-weight: bold;">${title}</div>
            <div style="color: #ffd4a6; font-size: 13px;">PENDING_REVIEW</div>
          </div>
          <div style="margin-top: 4px; color: #f0c1aa; font-size: 13px;">Topic: ${topicName}</div>
          <div style="margin-top: 4px; color: #dca892; font-size: 12px;">Contributor: ${contributorId}</div>
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
    }).join('');

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

    document.body.appendChild(modal);
    this.reviewQueueModal = modal;
    this.updateSceneInputInteractivity();

    const closeBtn = modal.querySelector('#close-review-queue-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyReviewQueueModal();
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

  updateSceneInputInteractivity() {
    this.input.enabled = !this.reviewQueueModal && !this.contributorAccountsModal;
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
}
