import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class ContributorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributorScene' });
    this.submitForm = null;
    this.submitMessageEl = null;
    this.submitButtonEl = null;
    this.cancelButtonEl = null;
    this.contentListModal = null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x0b1730);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1730);
    this.add.circle(width * 0.2, height * 0.25, 220, 0x1c3f7a, 0.14);
    this.add.circle(width * 0.8, height * 0.75, 260, 0x17345f, 0.16);

    this.add.text(width / 2, 88, 'CONTRIBUTOR PORTAL', {
      fontSize: '42px',
      color: '#e6f0ff',
      fontStyle: 'bold',
      stroke: '#071224',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Create and manage learning content', {
      fontSize: '18px',
      color: '#a6c3ec',
      stroke: '#071224',
      strokeThickness: 3
    }).setOrigin(0.5);

    const panelW = 860;
    const panelH = 460;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x101f3d, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const cardW = 250;
    const cardH = 150;
    const gap = 28;
    const totalCards = 2;
    const startX = width / 2 - ((cardW * totalCards + gap * (totalCards - 1)) / 2) + cardW / 2;
    const y = panelY + 140;

    this.createActionCard(startX, y, cardW, cardH, 'My Content', 'View content you submitted', async () => {
      await this.openMyContentWorkflow();
    });

    this.createActionCard(startX + cardW + gap, y, cardW, cardH, 'Submit Content', 'Open submit workflow', async () => {
      await this.openSubmitWorkflow();
    });

    this.createButton(width / 2 - 90, panelY + panelH - 64, 180, 42, 'Logout', async () => {
      this.destroySubmitForm();
      this.destroyContentListModal();
      await supabase.auth.signOut();
      gameState.clearState();
      this.scene.start('LoginScene');
    }, 0x4a1111, 0x7a1b1b);

    this.events.once('shutdown', () => {
      this.destroySubmitForm();
      this.destroyContentListModal();
    });
    this.events.once('destroy', () => {
      this.destroySubmitForm();
      this.destroyContentListModal();
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

    draw(0x1a2f58, 0x76a8e8);
    c.add(bg);
    c.add(this.add.text(w / 2, 42, title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#eef5ff',
      stroke: '#071224',
      strokeThickness: 4
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, 92, subtitle, {
      fontSize: '14px',
      color: '#bad2f2',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(0x244273, 0xaed2ff));
    hit.on('pointerout', () => draw(0x1a2f58, 0x76a8e8));
    hit.on('pointerdown', () => draw(0x132747, 0x5d8ccc));
    hit.on('pointerup', async (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      draw(0x244273, 0xaed2ff);
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
      color: '#f3f6ff',
      stroke: '#06101f',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(hover, 0xf0b030));
    hit.on('pointerout', () => draw(normal, 0xc8870a));
    hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
    hit.on('pointerup', (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      onClick();
    });
  }

  async requireContributorProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      this.showToast('No active session');
      return null;
    }
    return apiService.getContributorBySupabaseId(uid);
  }

  async openSubmitWorkflow() {
    if (this.submitForm) {
      this.showToast('Submit form is already open.');
      return;
    }

    let profile;
    let topics;
    try {
      [profile, topics] = await Promise.all([
        this.requireContributorProfile(),
        apiService.getAllTopics()
      ]);
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to open submit form';
      this.showToast(message);
      return;
    }

    if (!profile) return;
    if (!Array.isArray(topics) || topics.length === 0) {
      this.showToast('No topics available. Ask admin to create one first.');
      return;
    }

    this.renderSubmitForm(profile, topics);
  }

  async openMyContentWorkflow() {
    if (this.contentListModal) {
      this.showToast('My Content is already open.');
      return;
    }

    let profile;
    let rows;
    try {
      profile = await this.requireContributorProfile();
      if (!profile) return;
      rows = await apiService.getContentByContributor(profile.contributorId);
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to load content list';
      this.showToast(message);
      return;
    }

    this.renderMyContentModal(rows || []);
  }

  renderSubmitForm(profile, topics) {
    const form = document.createElement('div');
    form.style.position = 'absolute';
    form.style.left = '50%';
    form.style.top = '50%';
    form.style.transform = 'translate(-50%, -50%)';
    form.style.width = 'min(720px, calc(100vw - 40px))';
    form.style.maxHeight = '80vh';
    form.style.overflowY = 'auto';
    form.style.padding = '24px';
    form.style.background = 'rgba(16, 31, 61, 0.98)';
    form.style.border = '2px solid #c8870a';
    form.style.borderRadius = '10px';
    form.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    form.style.zIndex = '1000';

    const topicOptions = topics
      .map((t) => `<option value="${this.escapeHtml(String(t.topicId || ''))}">${this.escapeHtml(t.topicName || 'Untitled Topic')}</option>`)
      .join('');
    const contributorLabel = this.escapeHtml(profile.fullName || profile.email || profile.contributorId);

    form.innerHTML = `
      <h2 style="margin: 0 0 14px; color: #e6f0ff;">Submit New Content</h2>
      <p style="margin: 0 0 14px; color: #a6c3ec;">Contributor: ${contributorLabel}</p>

      <label style="display: block; color: #d5e7ff; margin-bottom: 6px;">Topic</label>
      <select id="content-topic" style="width: 100%; margin-bottom: 12px; padding: 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff;">
        ${topicOptions}
      </select>

      <label style="display: block; color: #d5e7ff; margin-bottom: 6px;">Title</label>
      <input id="content-title" type="text" maxlength="120" placeholder="e.g. What Is Rizz?" style="width: 100%; margin-bottom: 12px; padding: 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff;" />

      <label style="display: block; color: #d5e7ff; margin-bottom: 6px;">Description for AI Drafting</label>
      <textarea id="content-description" rows="7" placeholder="Describe what this lesson should teach. The AI will turn this into NPC dialogue." style="width: 100%; margin-bottom: 14px; padding: 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff; resize: vertical;"></textarea>

      <div style="display: flex; gap: 10px;">
        <button type="button" id="submit-content-btn" style="flex: 1; padding: 12px; background: #1f6d34; color: #f5fff8; border: 1px solid #5ec38a; border-radius: 6px; cursor: pointer; font-weight: bold;">
          Submit Content
        </button>
        <button type="button" id="cancel-content-btn" style="width: 140px; padding: 12px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Cancel
        </button>
      </div>

      <div id="submit-message" style="margin-top: 12px; min-height: 20px; color: #ffd4a6;"></div>
    `;

    document.body.appendChild(form);
    this.submitForm = form;
    this.submitMessageEl = form.querySelector('#submit-message');
    this.submitButtonEl = form.querySelector('#submit-content-btn');
    this.cancelButtonEl = form.querySelector('#cancel-content-btn');

    const titleEl = form.querySelector('#content-title');
    const topicEl = form.querySelector('#content-topic');
    const descriptionEl = form.querySelector('#content-description');

    const submitHandler = async () => {
      const topicId = topicEl?.value?.trim();
      const title = titleEl?.value?.trim();
      const description = descriptionEl?.value?.trim();

      if (!topicId || !title || !description) {
        this.setSubmitMessage('Please fill in topic, title, and description.', '#ffc7c7');
        return;
      }

      this.setSubmittingState(true);
      this.setSubmitMessage('Submitting content and running AI checks...', '#ffd4a6');

      try {
        const result = await apiService.submitContent({
          contributorId: profile.contributorId,
          topicId,
          title,
          description
        });

        const status = result?.status || 'UNKNOWN';
        const contentId = result?.contentId || '(missing id)';
        this.showToast(`Submitted. Status: ${status}`);
        this.destroySubmitForm();
        this.showToast(`Content ID: ${contentId}`);
      } catch (e) {
        const message =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          'Submit failed';
        this.setSubmitMessage(message, '#ffc7c7');
        this.setSubmittingState(false);
      }
    };

    this.submitButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      submitHandler();
    });
    this.cancelButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroySubmitForm();
    });
    descriptionEl?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        submitHandler();
      }
    });
  }

  setSubmittingState(isSubmitting) {
    if (this.submitButtonEl) {
      this.submitButtonEl.disabled = isSubmitting;
      this.submitButtonEl.style.opacity = isSubmitting ? '0.6' : '1';
      this.submitButtonEl.textContent = isSubmitting ? 'Submitting...' : 'Submit Content';
    }
    if (this.cancelButtonEl) {
      this.cancelButtonEl.disabled = isSubmitting;
      this.cancelButtonEl.style.opacity = isSubmitting ? '0.6' : '1';
    }
  }

  setSubmitMessage(message, color = '#ffd4a6') {
    if (!this.submitMessageEl) return;
    this.submitMessageEl.textContent = message;
    this.submitMessageEl.style.color = color;
  }

  destroySubmitForm() {
    if (this.submitForm && this.submitForm.parentNode) {
      this.submitForm.parentNode.removeChild(this.submitForm);
    }
    this.submitForm = null;
    this.submitMessageEl = null;
    this.submitButtonEl = null;
    this.cancelButtonEl = null;
  }

  renderMyContentModal(rows) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(900px, calc(100vw - 40px))';
    modal.style.maxHeight = '82vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(16, 31, 61, 0.98)';
    modal.style.border = '2px solid #76a8e8';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    const sortedRows = [...rows].sort((a, b) => {
      const at = new Date(a?.submittedAt || 0).getTime();
      const bt = new Date(b?.submittedAt || 0).getTime();
      return bt - at;
    });

    const rowHtml = sortedRows.map((row) => {
      const status = this.escapeHtml(row?.status || 'UNKNOWN');
      const title = this.escapeHtml(row?.title || 'Untitled');
      const topicName = this.escapeHtml(row?.topic?.topicName || 'Unknown Topic');
      const contentId = this.escapeHtml(row?.contentId || '');
      const submittedAt = this.formatDate(row?.submittedAt);
      const preview = this.escapeHtml(this.previewText(row?.body, 220));

      return `
        <div style="padding: 12px; border: 1px solid #345b8a; border-radius: 8px; margin-bottom: 10px; background: rgba(10, 23, 49, 0.7);">
          <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="color: #eef5ff; font-size: 16px; font-weight: bold;">${title}</div>
            <div style="color: #ffd4a6; font-size: 13px;">${status}</div>
          </div>
          <div style="margin-top: 4px; color: #bad2f2; font-size: 13px;">Topic: ${topicName}</div>
          <div style="margin-top: 4px; color: #9ebfe7; font-size: 12px;">Submitted: ${submittedAt}</div>
          <div style="margin-top: 4px; color: #9ebfe7; font-size: 12px;">ID: ${contentId}</div>
          <div style="margin-top: 8px; color: #dce8ff; font-size: 13px; line-height: 1.4;">${preview}</div>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #e6f0ff;">My Submitted Content</h2>
        <button type="button" id="close-content-list-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="margin-bottom: 12px; color: #a6c3ec;">Total: ${sortedRows.length}</div>
      <div>
        ${sortedRows.length ? rowHtml : '<div style="color: #dce8ff;">No submitted content yet.</div>'}
      </div>
    `;

    document.body.appendChild(modal);
    this.contentListModal = modal;

    const closeBtn = modal.querySelector('#close-content-list-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyContentListModal();
    });
  }

  destroyContentListModal() {
    if (this.contentListModal && this.contentListModal.parentNode) {
      this.contentListModal.parentNode.removeChild(this.contentListModal);
    }
    this.contentListModal = null;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    if (Number.isNaN(date.getTime())) return this.escapeHtml(String(value));
    return date.toLocaleString();
  }

  showToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, message, {
      fontSize: '14px',
      color: '#f1f6ff',
      backgroundColor: '#122647',
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
