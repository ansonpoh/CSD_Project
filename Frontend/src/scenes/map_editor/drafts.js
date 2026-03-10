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
      modal.style.position = 'absolute';
      modal.style.left = '50%';
      modal.style.top = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.width = '520px';
      modal.style.maxHeight = '70vh';
      modal.style.overflowY = 'auto';
      modal.style.padding = '14px';
      modal.style.background = 'rgba(8,18,34,0.98)';
      modal.style.border = '1px solid #436795';
      modal.style.borderRadius = '8px';
      modal.style.zIndex = '1001';

      const list = (rows || []).map((row) => `
        <button data-draft-id="${row.draftId}" style="width:100%;text-align:left;padding:10px;margin-bottom:8px;background:#122743;border:1px solid #35567f;color:#e7f2ff;border-radius:6px;cursor:pointer;">
          <div style="font-weight:700;">${this.escapeHtml(row.name || 'Untitled')}</div>
          <div style="font-size:12px;color:#a8c5e8;">${this.escapeHtml(row.description || '')}</div>
          <div style="font-size:11px;color:#8fb1d8;">Updated: ${this.escapeHtml(String(row.updatedAt || 'unknown'))}</div>
        </button>
      `).join('');

      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="color:#e7f2ff;font-weight:700;">Load Draft</div>
          <button id="me-close-load" style="padding:6px 10px;background:#3f1a1a;border:1px solid #8f5e5e;color:#ffecec;border-radius:4px;cursor:pointer;">Close</button>
        </div>
        ${list || '<div style="color:#c4d9f2;">No drafts yet.</div>'}
      `;

      document.body.appendChild(modal);
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
