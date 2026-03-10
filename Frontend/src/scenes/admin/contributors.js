import { apiService } from '../../services/api.js';

export const contributorAdminMethods = {
  async openContributorsWorkflow() {
    if (this.contributorAccountsModal) {
      this.showToast('Contributor accounts are already open.');
      return;
    }

    let rows;
    try {
      rows = await apiService.getAllContributors();
    } catch (error) {
      this.showToast(this.getErrorMessage(error, 'Unable to load contributor accounts'));
      return;
    }

    this.renderContributorAccountsModal(rows || []);
  },

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
  },

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
  },

  destroyContributorAccountsModal() {
    if (this.contributorAccountsModal && this.contributorAccountsModal.parentNode) {
      this.contributorAccountsModal.parentNode.removeChild(this.contributorAccountsModal);
    }
    this.contributorAccountsModal = null;
    this.updateSceneInputInteractivity();
  },

  destroyContributorDetailsModal() {
    if (this.contributorDetailsModal && this.contributorDetailsModal.parentNode) {
      this.contributorDetailsModal.parentNode.removeChild(this.contributorDetailsModal);
    }
    this.contributorDetailsModal = null;
    this.updateSceneInputInteractivity();
  }
};
