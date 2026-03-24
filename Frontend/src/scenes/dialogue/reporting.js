import { apiService } from '../../services/api.js';

export const dialogueSceneReportingMethods = {
  getContentId() {
    return this.npc?.contentId || this.npc?.content_id || null;
  },

  hasViewedEntireLesson() {
    return this.lessonPages.length === 0 || this.visitedPages.size >= this.lessonPages.length;
  },

  refreshRatingSummary() {
    if (!this.ratingSummaryText) return;
    const average = Number(this.currentContentRating?.averageRating || 0);
    const count = Number(this.currentContentRating?.ratingCount || 0);
    const mine = this.currentContentRating?.currentUserRating || 0;
    const progressText = this.hasViewedEntireLesson() ? '' : ' Finish the lesson to rate.';
    this.ratingSummaryText.setText(
      `Lesson rating ${average.toFixed(1)}* from ${count} rating${count === 1 ? '' : 's'} | Your rating ${mine}*.${progressText}`.trim()
    );
  },

  suspendSceneModalInput() {
    this.modalInputSuspendCount = Number(this.modalInputSuspendCount || 0) + 1;
    if (this.modalInputSuspendCount > 1) return;
    if (this.input) this.input.enabled = false;
  },

  resumeSceneModalInput() {
    this.modalInputSuspendCount = Math.max(0, Number(this.modalInputSuspendCount || 0) - 1);
    if (this.modalInputSuspendCount > 0) return;
    if (this.input) this.input.enabled = true;
  },

  async hydrateContentRating() {
    const contentId = this.getContentId();
    if (!contentId) return;

    try {
      const rating = await apiService.getContentRating(contentId);
      this.currentContentRating = {
        contentId,
        averageRating: Number(rating?.averageRating || 0),
        ratingCount: Number(rating?.ratingCount || 0),
        currentUserRating: rating?.currentUserRating ?? null
      };
      if (this.npc) {
        this.npc.averageRating = this.currentContentRating.averageRating;
        this.npc.ratingCount = this.currentContentRating.ratingCount;
        this.npc.currentUserRating = this.currentContentRating.currentUserRating;
      }
      this.refreshRatingSummary();
    } catch (e) {
      console.warn('Failed to load content rating:', e);
    }
  },

  openReportModal() {
    if (this.reportModal) return;

    const contentId = this.getContentId();
    if (!contentId) {
      this.showSceneToast('This lesson cannot be reported.');
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.45)';
    overlay.style.zIndex = '1000';
    overlay.style.pointerEvents = 'auto';

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
    modal.style.zIndex = '1001';

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

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.reportModal = overlay;
    this.input.keyboard.enabled = false;
    this.suspendSceneModalInput();

    overlay.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    overlay.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    modal.addEventListener('pointerdown', (event) => event.stopPropagation());
    modal.addEventListener('click', (event) => event.stopPropagation());

    this.suspendDomBlockingKeyCaptures();
    this.bindDomInputHotkeyShield(overlay);

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
    this.resumeSceneModalInput();
  },

  openRatingModal() {
    if (this.ratingModal) return;

    const contentId = this.getContentId();
    if (!contentId) {
      this.showSceneToast('This lesson cannot be rated.');
      return;
    }

    const currentRating = this.currentContentRating?.currentUserRating || 0;
    const average = Number(this.currentContentRating?.averageRating || 0);
    const count = Number(this.currentContentRating?.ratingCount || 0);
    const canSubmitRating = this.hasViewedEntireLesson();
    const ratingOptions = [1, 2, 3, 4, 5]
      .map((rating) => `
        <button
          type="button"
          data-rating-value="${rating}"
          style="padding:12px 0; background:${currentRating === rating ? '#3d1860' : '#0d1a30'}; color:#f0ecff; border:1px solid ${currentRating === rating ? '#f0b030' : '#2a5090'}; border-radius:8px; cursor:${canSubmitRating ? 'pointer' : 'not-allowed'}; font-weight:bold; opacity:${canSubmitRating ? '1' : '0.55'};"
          ${canSubmitRating ? '' : 'disabled'}
        >
          ${rating}*
        </button>
      `)
      .join('');

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.45)';
    overlay.style.zIndex = '1000';
    overlay.style.pointerEvents = 'auto';

    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(520px, calc(100vw - 32px))';
    modal.style.padding = '20px';
    modal.style.background = 'rgba(8, 14, 34, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.55)';
    modal.style.zIndex = '1001';

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
        <h2 style="margin:0; color:#f0ecff; font-size:22px;">Rate Lesson</h2>
        <button type="button" id="close-rating-modal-btn" style="padding:8px 12px; background:#4a1111; color:#ffe9e9; border:1px solid #ab6666; border-radius:6px; cursor:pointer;">
          Close
        </button>
      </div>

      <div style="margin-bottom:10px; color:#c0a8e0; font-size:14px;">
        Current average: ${average.toFixed(1)}* from ${count} rating${count === 1 ? '' : 's'}.
      </div>

      <div style="margin-bottom:12px; color:${canSubmitRating ? '#a7f0c2' : '#ffd4a6'}; font-size:13px;">
        ${canSubmitRating ? 'You can rate this lesson now.' : 'Finish all lesson pages before submitting a rating.'}
      </div>

      <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:10px; margin-bottom:12px;">
        ${ratingOptions}
      </div>

      <div id="rating-status" style="min-height:18px; margin-bottom:12px; color:#ffd4a6;"></div>

      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button type="button" id="submit-rating-btn" ${canSubmitRating ? '' : 'disabled'} style="padding:10px 14px; background:#1f3e76; color:#f5fbff; border:1px solid #6ea8ff; border-radius:6px; cursor:${canSubmitRating ? 'pointer' : 'not-allowed'}; font-weight:bold; opacity:${canSubmitRating ? '1' : '0.55'};">
          Save Rating
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.ratingModal = overlay;
    this.input.keyboard.enabled = false;
    this.suspendSceneModalInput();

    overlay.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    overlay.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    modal.addEventListener('pointerdown', (event) => event.stopPropagation());
    modal.addEventListener('click', (event) => event.stopPropagation());

    this.suspendDomBlockingKeyCaptures();
    this.bindDomInputHotkeyShield(overlay);

    let selectedRating = currentRating;
    const drawSelectedRating = () => {
      modal.querySelectorAll('[data-rating-value]').forEach((button) => {
        const value = Number(button.getAttribute('data-rating-value') || 0);
        button.style.background = value === selectedRating ? '#3d1860' : '#0d1a30';
        button.style.borderColor = value === selectedRating ? '#f0b030' : '#2a5090';
      });
    };

    if (canSubmitRating) {
      modal.querySelectorAll('[data-rating-value]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectedRating = Number(button.getAttribute('data-rating-value') || 0);
          drawSelectedRating();
          this.setRatingStatus(`Selected ${selectedRating}*.`, '#ffd4a6');
        });
      });
    } else {
      this.setRatingStatus('Finish the lesson before rating it.', '#ffd4a6');
    }

    modal.querySelector('#close-rating-modal-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyRatingModal();
    });

    modal.querySelector('#submit-rating-btn')?.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!canSubmitRating) {
        this.setRatingStatus('Finish the lesson before rating it.', '#ffd4a6');
        return;
      }

      if (!selectedRating) {
        this.setRatingStatus('Please select a rating.', '#ffc7c7');
        return;
      }

      await this.submitContentRating(contentId, selectedRating);
    });
  },

  async submitContentRating(contentId, rating) {
    try {
      this.setRatingStatus('Saving rating...', '#ffd4a6');
      this.setRatingFormEnabled(false);

      const saved = await apiService.rateContent(contentId, rating);
      this.currentContentRating = {
        contentId: saved?.contentId || contentId,
        averageRating: Number(saved?.averageRating || 0),
        ratingCount: Number(saved?.ratingCount || 0),
        currentUserRating: saved?.currentUserRating ?? rating
      };
      if (this.npc) {
        this.npc.averageRating = this.currentContentRating.averageRating;
        this.npc.ratingCount = this.currentContentRating.ratingCount;
        this.npc.currentUserRating = this.currentContentRating.currentUserRating;
      }
      this.refreshRatingSummary();
      this.setRatingStatus('Rating saved.', '#a7f0c2');
      this.showSceneToast('Lesson rating updated.');
      this.time.delayedCall(700, () => this.destroyRatingModal());
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to save rating';
      this.setRatingStatus(message, '#ffc7c7');
      this.setRatingFormEnabled(true);
    }
  },

  setRatingStatus(message, color = '#ffd4a6') {
    if (!this.ratingModal) return;
    const statusEl = this.ratingModal.querySelector('#rating-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  },

  setRatingFormEnabled(enabled) {
    if (!this.ratingModal) return;
    const fields = this.ratingModal.querySelectorAll('button');
    fields.forEach((el) => {
      el.disabled = !enabled;
      el.style.opacity = enabled ? '1' : '0.65';
      el.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
  },

  destroyRatingModal() {
    if (this.ratingModal?.parentNode) {
      this.ratingModal.parentNode.removeChild(this.ratingModal);
    }
    this.ratingModal = null;

    if (this.input?.keyboard) {
      this.input.keyboard.enabled = true;
    }

    this.restoreDomBlockingKeyCaptures();
    this.resumeSceneModalInput();
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
