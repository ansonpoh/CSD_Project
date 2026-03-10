import { apiService } from '../../services/api.js';

export const reviewQueueAdminMethods = {
  async openReviewQueueWorkflow() {
    if (this.reviewQueueModal) {
      this.showToast('Review queue is already open.');
      return;
    }

    let rows;
    try {
      rows = await apiService.getContentQueue();
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Unable to load review queue'));
      return;
    }

    await this.renderReviewQueueModal(rows || []);
  },

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
        } catch (error) {
          console.warn('Unable to load contributor details', error);
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
        const contributorId = link.getAttribute('data-contributor-id');
        const contributorInfo = contributorMap[contributorId];
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
        } catch (error) {
          this.setReviewQueueStatus(this.getErrorMessage(error, 'Moderation action failed'), '#ffc7c7');
        } finally {
          this.setReviewActionButtonsEnabled(true);
        }
      });
    });
  },

  updatePendingCount(count) {
    if (!this.reviewQueueModal) return;
    const summary = this.reviewQueueModal.querySelector('#review-queue-count');
    if (summary) {
      summary.textContent = `Total pending: ${count}`;
    }
  },

  setReviewQueueStatus(message, color = '#ffd4a6') {
    if (!this.reviewQueueModal) return;
    const statusEl = this.reviewQueueModal.querySelector('#review-queue-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  },

  setReviewActionButtonsEnabled(enabled) {
    if (!this.reviewQueueModal) return;
    const buttons = this.reviewQueueModal.querySelectorAll('button[data-action]');
    buttons.forEach((button) => {
      button.disabled = !enabled;
      button.style.opacity = enabled ? '1' : '0.6';
      button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
  },

  destroyReviewQueueModal() {
    if (this.reviewQueueModal && this.reviewQueueModal.parentNode) {
      this.reviewQueueModal.parentNode.removeChild(this.reviewQueueModal);
    }
    this.reviewQueueModal = null;
    this.updateSceneInputInteractivity();
  }
};
