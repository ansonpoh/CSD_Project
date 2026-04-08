import { apiService } from '../../services/api.js';
import {
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  DEFAULT_TILESET
} from './constants.js';
import { createEmptyLayer } from './state.js';

export const draftMethods = {
  async saveDraft() {
    try {
      const payload = {
        draftId: this.currentDraftId,
        name: this.getFormValue('#me-name') || 'Untitled Draft',
        description: this.getFormValue('#me-desc'),
        mapData: this.buildRuntimePayload()
      };
      const saved = await apiService.saveMapDraft(payload);
      this.currentDraftId = saved?.draftId || this.currentDraftId;
      this.setStatus(`Draft saved: ${this.currentDraftId}`);
      this.refreshStatusMeta();
      this.pushHistory('save');
      this.showSuccessModal({
        title: 'Draft Saved',
        message: `Draft ${this.currentDraftId || 'successfully'} saved. You can continue editing or submit it for review when ready.`
      });
    } catch (error) {
      this.setStatus(`Save failed: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  async openLoadDraftModal() {
    if (this.uiModal) return;
    try {
      const rows = await apiService.getMyMapDrafts();
      const modal = document.createElement('div');
      modal.className = 'me-surface me-modal';

      const list = (rows || []).map((row) => `
        <div class="me-draft-card" data-draft-id="${row.draftId}">
          <div class="me-draft-card__title">${this.escapeHtml(row.name || 'Untitled')}</div>
          <div class="me-draft-card__body">${this.escapeHtml(row.description || 'No description yet.')}</div>
          <div class="me-draft-card__meta">Updated: ${this.escapeHtml(String(row.updatedAt || 'unknown'))}</div>
          <div class="me-chip-row" style="margin-top: 10px;">
            <button type="button" class="me-action me-action--ghost" data-load-draft-id="${row.draftId}">Load</button>
            <button type="button" class="me-action me-action--warning" data-delete-draft-id="${row.draftId}">Delete</button>
          </div>
        </div>
      `).join('');

      modal.innerHTML = `
        <div class="me-modal__header">
          <div>
            <div class="me-sidebar__title">Draft Library</div>
            <h3>Load a saved map</h3>
          </div>
          <button type="button" class="me-action me-action--ghost" id="me-close-load">Close</button>
        </div>
        <div class="me-modal__list">
          ${list || '<div class="me-copy">No drafts yet.</div>'}
        </div>
      `;

      this.modalHostEl?.classList.add('is-open');
      this.modalHostEl.innerHTML = '<div class="me-modal-backdrop"></div>';
      this.modalHostEl.appendChild(modal);
      this.modalHostEl.querySelector('.me-modal-backdrop')?.addEventListener('click', () => {
        this.closeLoadDraftModal();
      });
      this.uiModal = modal;

      modal.querySelector('#me-close-load')?.addEventListener('click', (event) => {
        event.preventDefault();
        this.closeLoadDraftModal();
      });

      modal.querySelectorAll('[data-load-draft-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          const draftId = button.getAttribute('data-load-draft-id');
          await this.loadDraftById(draftId);
          this.closeLoadDraftModal();
        });
      });

      modal.querySelectorAll('[data-delete-draft-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const draftId = button.getAttribute('data-delete-draft-id');
          if (!draftId) return;
          this.openDeleteDraftConfirmModal(draftId);
        });
      });
    } catch (error) {
      this.setStatus(`Failed to load drafts: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  closeLoadDraftModal() {
    if (this.uiModal?.parentNode) this.uiModal.parentNode.removeChild(this.uiModal);
    this.uiModal = null;
    if (this.modalHostEl) {
      this.modalHostEl.innerHTML = '';
      this.modalHostEl.classList.remove('is-open');
    }
  },

  showSuccessModal({ title, message }) {
    if (!this.modalHostEl) return;

    if (this.uiModal?.parentNode) this.uiModal.parentNode.removeChild(this.uiModal);
    this.uiModal = null;

    const modal = document.createElement('div');
    modal.className = 'me-surface me-modal';
    modal.innerHTML = `
      <div class="me-modal__header">
        <div>
          <div class="me-sidebar__title">Success</div>
          <h3>${this.escapeHtml(title || 'Action complete')}</h3>
        </div>
      </div>
      <div class="me-copy" style="margin-bottom: 18px;">${this.escapeHtml(message || 'Completed successfully.')}</div>
      <div class="me-chip-row">
        <button type="button" class="me-action me-action--success" id="me-close-success-modal">Close</button>
      </div>
    `;

    this.modalHostEl.classList.add('is-open');
    this.modalHostEl.innerHTML = '<div class="me-modal-backdrop"></div>';
    this.modalHostEl.appendChild(modal);
    this.uiModal = modal;

    modal.querySelector('#me-close-success-modal')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.closeLoadDraftModal();
    });
  },

  async loadDraftById(draftId) {
    try {
      const row = await apiService.getMapDraft(draftId);
      const mapData = row?.mapData;
      if (!mapData?.layers) throw new Error('Draft payload missing layers');

      this.currentDraftId = row.draftId;
      this.tilesetKey = mapData.tilesetKey || DEFAULT_TILESET;
      this.mapWidth = mapData.width || DEFAULT_MAP_WIDTH;
      this.mapHeight = mapData.height || DEFAULT_MAP_HEIGHT;
      this.mapLayers = {
        ground: mapData.layers.ground || createEmptyLayer(this.mapWidth, this.mapHeight),
        decor: mapData.layers.decor || createEmptyLayer(this.mapWidth, this.mapHeight),
        collision: mapData.layers.collision || createEmptyLayer(this.mapWidth, this.mapHeight)
      };
      this.markers = {
        npcs: mapData.spawns?.npcs || [],
        monsters: mapData.spawns?.monsters || []
      };

      this.buildTilemap();
      this.rebuildPaletteTiles();
      this.refreshToolbarLabel();
      this.setFormValue('#me-name', row.name || '');
      this.setFormValue('#me-desc', row.description || '');
      this.setStatus(`Loaded draft: ${row.name || row.draftId}`);
      this.refreshStatusMeta();
      this.pushHistory('load');
    } catch (error) {
      this.setStatus(`Load failed: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  async publishDraft() {
    if (!this.currentDraftId) {
      this.setStatus('Save draft first before submitting.');
      return;
    }
    try {
      const submitted = await apiService.submitMapDraft(this.currentDraftId, {
        name: this.getFormValue('#me-name') || 'Contributor Map',
        description: this.getFormValue('#me-desc')
      });
      const submitId = submitted?.mapId || submitted?.id || 'success';
      this.setStatus(`Submitted for admin review: ${submitId}`);
      this.refreshStatusMeta();
      this.showSuccessModal({
        title: 'Submitted For Review',
        message: `Map ${submitId} was submitted to admins successfully.`
      });
    } catch (error) {
      this.setStatus(`Submission failed: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  openDeleteDraftConfirmModal(draftId) {
    if (!draftId || !this.modalHostEl) return;

    if (this.uiModal?.parentNode) this.uiModal.parentNode.removeChild(this.uiModal);
    this.uiModal = null;

    const modal = document.createElement('div');
    modal.className = 'me-surface me-modal';
    modal.innerHTML = `
      <div class="me-modal__header">
        <div>
          <div class="me-sidebar__title">Delete Draft</div>
          <h3>Delete this draft?</h3>
        </div>
      </div>
      <div class="me-copy" style="margin-bottom: 18px;">
        This action is permanent. The draft and its saved snapshots will be removed.
      </div>
      <div class="me-chip-row">
        <button type="button" class="me-action me-action--ghost" id="me-cancel-delete-draft">Cancel</button>
        <button type="button" class="me-action me-action--warning" id="me-confirm-delete-draft">Delete Draft</button>
      </div>
    `;

    this.modalHostEl.classList.add('is-open');
    this.modalHostEl.innerHTML = '<div class="me-modal-backdrop"></div>';
    this.modalHostEl.appendChild(modal);
    this.uiModal = modal;

    const closeAndReturnToLibrary = async () => {
      this.closeLoadDraftModal();
      await this.openLoadDraftModal();
    };

    modal.querySelector('#me-cancel-delete-draft')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await closeAndReturnToLibrary();
    });

    modal.querySelector('#me-confirm-delete-draft')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.deleteDraftById(draftId);
      await closeAndReturnToLibrary();
    });
  },

  async deleteDraftById(draftId) {
    try {
      await apiService.deleteMapDraft(draftId);
      if (this.currentDraftId === draftId) {
        this.currentDraftId = null;
      }
      this.setStatus('Draft deleted.');
      this.refreshStatusMeta();
    } catch (error) {
      this.setStatus(`Delete failed: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  playTest() {
    const runtime = this.buildRuntimePayload();
    this.scene.start('GameMapScene', {
      mapConfig: {
        name: this.getFormValue('#me-name') || 'Playtest Map',
        editorMapData: runtime,
        returnSceneKey: 'MapEditorScene'
      }
    });
  }
};
