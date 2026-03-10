import { apiService } from '../../../services/api.js';
import { createAdminModal, escapeHtml, getApiErrorMessage } from '../adminDomUtils.js';
import { setSceneModal, destroySceneModal } from '../adminModalState.js';
import { showToast } from '../adminUi.js';

const MODAL_KEY = 'contributorAccountsModal';

export async function openContributorAccountsModal(scene) {
  if (scene[MODAL_KEY]) {
    showToast(scene, 'Contributor accounts are already open.');
    return;
  }

  let rows;
  try {
    rows = await apiService.getAllContributors();
  } catch (error) {
    showToast(scene, getApiErrorMessage(error, 'Unable to load contributor accounts'));
    return;
  }

  renderContributorAccountsModal(scene, rows || []);
}

export function destroyContributorAccountsModal(scene) {
  destroySceneModal(scene, MODAL_KEY);
}

function renderContributorAccountsModal(scene, rows) {
  const modal = createAdminModal({
    width: 'min(960px, calc(100vw - 40px))',
    maxHeight: '82vh'
  });

  const normalizedRows = Array.isArray(rows) ? rows : [];
  const sortedRows = [...normalizedRows].sort((a, b) =>
    String(a?.fullName || '').localeCompare(String(b?.fullName || ''))
  );

  const rowHtml = sortedRows.map((row) => {
    const contributorId = escapeHtml(row?.contributorId || 'Unknown');
    const fullName = escapeHtml(row?.fullName || 'Unknown');
    const email = escapeHtml(row?.email || 'Unknown');
    const bio = escapeHtml(row?.bio || '');
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
  setSceneModal(scene, MODAL_KEY, modal);

  const closeBtn = modal.querySelector('#close-contributor-accounts-btn');
  closeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    destroyContributorAccountsModal(scene);
  });
}
