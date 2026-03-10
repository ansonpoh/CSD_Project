import { apiService } from '../../services/api.js';

export const dialogueSceneReportingMethods = {
  getContentId() {
    return this.npc?.contentId || this.npc?.content_id || null;
  },

  openReportModal() {
    if (this.reportModal) return;

    const contentId = this.getContentId();
    if (!contentId) {
      this.showSceneToast('This lesson cannot be reported.');
      return;
    }

    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(560px, calc(100vw - 32px))';
    modal.style.padding = '20px';
    modal.style.background = 'rgba(8, 14, 34, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.55)';
    modal.style.zIndex = '1000';

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
        <h2 style="margin:0; color:#f0ecff; font-size:22px;">Report Content</h2>
        <button type="button" id="close-flag-modal-btn" style="padding:8px 12px; background:#4a1111; color:#ffe9e9; border:1px solid #ab6666; border-radius:6px; cursor:pointer;">
          Close
        </button>
      </div>

      <div style="margin-bottom:10px; color:#c0a8e0; font-size:14px;">
        Select a reason and optionally add more detail.
      </div>

      <label for="flag-reason" style="display:block; margin-bottom:6px; color:#f4c048; font-size:13px;">Reason</label>
      <select id="flag-reason" style="width:100%; padding:10px; margin-bottom:12px; border-radius:6px; border:1px solid #2a5090; background:#0d1a30; color:#f0ecff;">
        <option value="">Select a reason</option>
        <option value="MISINFORMATION">Misinformation</option>
        <option value="OFFENSIVE_CONTENT">Offensive Content</option>
        <option value="HARASSMENT">Harassment</option>
        <option value="SPAM">Spam</option>
        <option value="COPYRIGHT">Copyright</option>
        <option value="OTHER">Other</option>
      </select>

      <label for="flag-details" style="display:block; margin-bottom:6px; color:#f4c048; font-size:13px;">Details</label>
      <textarea id="flag-details" rows="5" maxlength="1000" placeholder="Required if reason is Other" style="width:100%; padding:10px; margin-bottom:12px; border-radius:6px; border:1px solid #2a5090; background:#0d1a30; color:#f0ecff; resize:vertical;"></textarea>

      <div id="flag-status" style="min-height:18px; margin-bottom:12px; color:#ffd4a6;"></div>

      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button type="button" id="submit-flag-btn" style="padding:10px 14px; background:#1f3e76; color:#f5fbff; border:1px solid #6ea8ff; border-radius:6px; cursor:pointer; font-weight:bold;">
          Submit Report
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    this.reportModal = modal;
    this.input.keyboard.enabled = false;

    this.suspendDomBlockingKeyCaptures();
    this.bindDomInputHotkeyShield(modal);

    this.time.delayedCall(0, () => {
      const detailsField = modal.querySelector('#flag-details');
      detailsField?.focus();
    });

    const closeBtn = modal.querySelector('#close-flag-modal-btn');
    const submitBtn = modal.querySelector('#submit-flag-btn');
    const reasonEl = modal.querySelector('#flag-reason');
    const detailsEl = modal.querySelector('#flag-details');

    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyReportModal();
    });

    submitBtn?.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const reason = reasonEl?.value || '';
      const details = detailsEl?.value?.trim() || '';

      if (!reason) {
        this.setReportStatus('Please select a reason.', '#ffc7c7');
        return;
      }

      if (reason === 'OTHER' && !details) {
        this.setReportStatus('Details are required when reason is Other.', '#ffc7c7');
        return;
      }

      await this.submitContentFlag(contentId, reason, details);
    });
  },

  async submitContentFlag(contentId, reason, details) {
    try {
      this.setReportStatus('Submitting report...', '#ffd4a6');
      this.setReportFormEnabled(false);

      await apiService.flagContent(contentId, {
        reason,
        details: details || null
      });

      this.setReportStatus('Report submitted.', '#a7f0c2');
      this.showSceneToast('Content reported.');
      this.time.delayedCall(700, () => this.destroyReportModal());
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to submit report';
      this.setReportStatus(message, '#ffc7c7');
      this.setReportFormEnabled(true);
    }
  },

  setReportStatus(message, color = '#ffd4a6') {
    if (!this.reportModal) return;
    const statusEl = this.reportModal.querySelector('#flag-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  },

  setReportFormEnabled(enabled) {
    if (!this.reportModal) return;
    const fields = this.reportModal.querySelectorAll('select, textarea, button');
    fields.forEach((el) => {
      el.disabled = !enabled;
      el.style.opacity = enabled ? '1' : '0.65';
      if (el.tagName === 'BUTTON') {
        el.style.cursor = enabled ? 'pointer' : 'not-allowed';
      }
    });
  },

  destroyReportModal() {
    if (this.reportModal?.parentNode) {
      this.reportModal.parentNode.removeChild(this.reportModal);
    }
    this.reportModal = null;

    if (this.input?.keyboard) {
      this.input.keyboard.enabled = true;
    }

    this.restoreDomBlockingKeyCaptures();
  },

  showSceneToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, 44, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#3b1e17',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 10,
      duration: 1400,
      onComplete: () => text.destroy()
    });
  }
};
