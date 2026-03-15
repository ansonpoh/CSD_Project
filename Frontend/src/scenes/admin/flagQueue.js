import { apiService } from '../../services/api.js';

export const flagQueueAdminMethods = {
  async openFlagQueueWorkflow() {
    if (this.flagQueueModal) {
      this.showToast('Flag queue is already open.');
      return;
    }

    let rows;
    try {
      rows = await apiService.getOpenContentFlags();
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Unable to load content flags'));
      return;
    }

    this.renderFlagQueueModal(rows || []);
  },

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
        row?.reportedBy ||
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
        } catch (error) {
          this.setFlagQueueStatus(this.getErrorMessage(error, 'Flag action failed'), '#ffc7c7');
        } finally {
          this.setFlagActionButtonsEnabled(true);
        }
      });
    });
  },

  updateFlagPendingCount(count) {
    if (!this.flagQueueModal) return;
    const summary = this.flagQueueModal.querySelector('#flag-queue-count');
    if (summary) {
      summary.textContent = `Total open flags: ${count}`;
    }
  },

  setFlagQueueStatus(message, color = '#ffd4a6') {
    if (!this.flagQueueModal) return;
    const statusEl = this.flagQueueModal.querySelector('#flag-queue-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  },

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
  },

  destroyFlagQueueModal() {
    if (this.flagQueueModal && this.flagQueueModal.parentNode) {
      this.flagQueueModal.parentNode.removeChild(this.flagQueueModal);
    }
    this.flagQueueModal = null;
    this.updateSceneInputInteractivity();
  }
};
