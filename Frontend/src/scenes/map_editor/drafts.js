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
        biome: this.getFormValue('#me-bio'),
        difficulty: this.getFormValue('#me-diff'),
        mapData: this.buildRuntimePayload()
      };
      const saved = await apiService.saveMapDraft(payload);
      this.currentDraftId = saved?.draftId || this.currentDraftId;
      this.setStatus(`Draft saved: ${this.currentDraftId}`);
      this.refreshStatusMeta();
      this.pushHistory('save');
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
        <button type="button" class="me-draft-card" data-draft-id="${row.draftId}">
          <div class="me-draft-card__title">${this.escapeHtml(row.name || 'Untitled')}</div>
          <div class="me-draft-card__body">${this.escapeHtml(row.description || 'No description yet.')}</div>
          <div class="me-draft-card__meta">Updated: ${this.escapeHtml(String(row.updatedAt || 'unknown'))}</div>
        </button>
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

      modal.querySelectorAll('[data-draft-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          const draftId = button.getAttribute('data-draft-id');
          await this.loadDraftById(draftId);
          this.closeLoadDraftModal();
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
      this.setFormValue('#me-bio', row.biome || '');
      this.setFormValue('#me-diff', row.difficulty || '');
      this.setStatus(`Loaded draft: ${row.name || row.draftId}`);
      this.refreshStatusMeta();
      this.pushHistory('load');
    } catch (error) {
      this.setStatus(`Load failed: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  async publishDraft() {
    if (!this.currentDraftId) {
      this.setStatus('Save draft first before publishing.');
      return;
    }
    try {
      const published = await apiService.publishMapDraft(this.currentDraftId, {
        name: this.getFormValue('#me-name') || 'Contributor Map',
        description: this.getFormValue('#me-desc')
      });
      this.setStatus(`Published map: ${published?.mapId || published?.id || 'success'}`);
      this.refreshStatusMeta();
    } catch (error) {
      this.setStatus(`Publish failed: ${error?.response?.data?.message || error?.message || 'unknown error'}`);
    }
  },

  playTest() {
    const runtime = this.buildRuntimePayload();
    this.scene.start('GameMapScene', {
      mapConfig: {
        name: this.getFormValue('#me-name') || 'Playtest Map',
        editorMapData: runtime
      }
    });
  }
};
