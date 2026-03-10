import { apiService } from '../../../services/api.js';
import {
  createAdminModal,
  escapeCssSelector,
  escapeHtml,
  formatDate,
  getApiErrorMessage,
  previewText
} from '../adminDomUtils.js';
import { setSceneModal, destroySceneModal } from '../adminModalState.js';
import { showToast } from '../adminUi.js';

const MODAL_KEY = 'reviewQueueModal';

export async function openReviewQueueModal(scene) {
  if (scene[MODAL_KEY]) {
    showToast(scene, 'Review queue is already open.');
    return;
  }

  let rows;
  try {
    rows = await apiService.getContentQueue();
  } catch (error) {
    showToast(scene, getApiErrorMessage(error, 'Unable to load review queue'));
    return;
  }

  renderReviewQueueModal(scene, rows || []);
}

export function destroyReviewQueueModal(scene) {
  destroySceneModal(scene, MODAL_KEY);
}

function renderReviewQueueModal(scene, rows) {
  const modal = createAdminModal({
    width: 'min(960px, calc(100vw - 40px))',
    maxHeight: '82vh'
  });

  const sortedRows = [...rows].sort((a, b) => {
    const at = new Date(a?.submittedAt || 0).getTime();
    const bt = new Date(b?.submittedAt || 0).getTime();
    return bt - at;
  });

  const rowHtml = sortedRows.map((row) => {
    const contentId = escapeHtml(row?.contentId || '');
    const title = escapeHtml(row?.title || 'Untitled');
    const topicName = escapeHtml(row?.topic?.topicName || 'Unknown Topic');
    const contributorId = escapeHtml(row?.contributorId || 'Unknown');
    const submittedAt = escapeHtml(formatDate(row?.submittedAt));
    const preview = escapeHtml(previewText(row?.body, 260));

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
  setSceneModal(scene, MODAL_KEY, modal);

  const closeBtn = modal.querySelector('#close-review-queue-btn');
  closeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    destroyReviewQueueModal(scene);
  });

  const actionButtons = modal.querySelectorAll('button[data-action]');
  actionButtons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const action = button.getAttribute('data-action');
      const contentId = button.getAttribute('data-content-id');
      if (!action || !contentId) return;

      setReviewQueueStatus(scene, `${action === 'approve' ? 'Approving' : 'Rejecting'} content...`, '#ffd4a6');
      setReviewActionButtonsEnabled(scene, false);

      try {
        if (action === 'approve') {
          await apiService.approveContent(contentId);
          showToast(scene, 'Content approved.');
        } else {
          await apiService.rejectContent(contentId);
          showToast(scene, 'Content rejected.');
        }

        const rowEl = modal.querySelector(`[data-row-id="${escapeCssSelector(contentId)}"]`);
        rowEl?.remove();

        const remaining = modal.querySelectorAll('[data-row-id]').length;
        const list = modal.querySelector('#review-queue-list');
        if (remaining === 0 && list) {
          list.innerHTML = '<div style="color: #ffe7dc;">No content is pending review.</div>';
        }

        updatePendingCount(scene, remaining);
        setReviewQueueStatus(scene, 'Action completed.', '#a7f0c2');
      } catch (error) {
        setReviewQueueStatus(scene, getApiErrorMessage(error, 'Moderation action failed'), '#ffc7c7');
      } finally {
        setReviewActionButtonsEnabled(scene, true);
      }
    });
  });
}

function updatePendingCount(scene, count) {
  const summary = scene.reviewQueueModal?.querySelector('#review-queue-count');
  if (summary) {
    summary.textContent = `Total pending: ${count}`;
  }
}

function setReviewQueueStatus(scene, message, color = '#ffd4a6') {
  const statusEl = scene.reviewQueueModal?.querySelector('#review-queue-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = color;
}

function setReviewActionButtonsEnabled(scene, enabled) {
  const buttons = scene.reviewQueueModal?.querySelectorAll('button[data-action]');
  buttons?.forEach((button) => {
    button.disabled = !enabled;
    button.style.opacity = enabled ? '1' : '0.6';
    button.style.cursor = enabled ? 'pointer' : 'not-allowed';
  });
}
