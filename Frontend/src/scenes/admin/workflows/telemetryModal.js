import { apiService } from '../../../services/api.js';
import {
  createAdminModal,
  escapeHtml,
  formatMetric,
  formatPercent,
  getApiErrorMessage
} from '../adminDomUtils.js';
import { setSceneModal, destroySceneModal } from '../adminModalState.js';
import { showToast } from '../adminUi.js';

const MODAL_KEY = 'telemetryModal';

export async function openTelemetryModal(scene) {
  if (scene[MODAL_KEY]) {
    showToast(scene, 'Telemetry dashboard is already open.');
    return;
  }

  let maps = [];
  let dashboard;
  try {
    [maps, dashboard] = await Promise.all([
      apiService.getAllMaps().catch(() => []),
      apiService.getEncounterTelemetryDashboard()
    ]);
  } catch (error) {
    showToast(scene, getApiErrorMessage(error, 'Unable to load encounter telemetry'));
    return;
  }

  renderTelemetryModal(scene, maps || [], dashboard || null);
}

export function destroyTelemetryModal(scene) {
  destroySceneModal(scene, MODAL_KEY);
}

function renderTelemetryModal(scene, maps, dashboard) {
  const modal = createAdminModal({
    width: 'min(980px, calc(100vw - 40px))',
    maxHeight: '84vh'
  });

  const mapOptions = [
    '<option value="">All Maps</option>',
    ...(Array.isArray(maps) ? maps : []).map((map) => {
      const id = escapeHtml(map?.mapId || map?.id || '');
      const name = escapeHtml(map?.name || 'Unnamed Map');
      return `<option value="${id}">${name}</option>`;
    })
  ].join('');

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
      <h2 style="margin: 0; color: #ffe8dc;">Encounter Telemetry</h2>
      <button type="button" id="close-telemetry-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
        Close
      </button>
    </div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 12px;">
      <label for="telemetry-map-select" style="color: #f3c7b3; font-size: 13px;">Scope</label>
      <select id="telemetry-map-select" style="padding: 8px 10px; background: #23120f; color: #ffe8dc; border: 1px solid #845042; border-radius: 6px; min-width: 240px;">
        ${mapOptions}
      </select>
      <button type="button" id="telemetry-refresh-btn" style="padding: 8px 12px; background: #2a2218; color: #fff0e8; border: 1px solid #c8870a; border-radius: 6px; cursor: pointer;">
        Refresh
      </button>
    </div>
    <div id="telemetry-status" style="min-height: 18px; margin-bottom: 12px; color: #ffd4a6;"></div>
    <div id="telemetry-content">${renderTelemetryCards(dashboard)}</div>
  `;

  document.body.appendChild(modal);
  setSceneModal(scene, MODAL_KEY, modal);

  const closeBtn = modal.querySelector('#close-telemetry-btn');
  const refreshBtn = modal.querySelector('#telemetry-refresh-btn');
  const mapSelect = modal.querySelector('#telemetry-map-select');
  const statusEl = modal.querySelector('#telemetry-status');
  const contentEl = modal.querySelector('#telemetry-content');

  const setStatus = (message, color = '#ffd4a6') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  };

  const setControlsEnabled = (enabled) => {
    if (refreshBtn) {
      refreshBtn.disabled = !enabled;
      refreshBtn.style.opacity = enabled ? '1' : '0.6';
      refreshBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
    if (mapSelect) {
      mapSelect.disabled = !enabled;
      mapSelect.style.opacity = enabled ? '1' : '0.7';
    }
  };

  const refreshDashboard = async () => {
    const mapId = mapSelect?.value || null;
    setStatus('Refreshing telemetry...', '#ffd4a6');
    setControlsEnabled(false);
    try {
      const data = await apiService.getEncounterTelemetryDashboard(mapId || null);
      if (contentEl) {
        contentEl.innerHTML = renderTelemetryCards(data);
      }
      setStatus('Telemetry updated.', '#a7f0c2');
    } catch (error) {
      setStatus(getApiErrorMessage(error, 'Telemetry refresh failed'), '#ffc7c7');
    } finally {
      setControlsEnabled(true);
    }
  };

  closeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    destroyTelemetryModal(scene);
  });
  refreshBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void refreshDashboard();
  });
  mapSelect?.addEventListener('change', () => {
    void refreshDashboard();
  });
}

function renderTelemetryCards(data) {
  const dashboard = data || {};
  const countRows = [
    ['Map Entered', dashboard.mapEntered],
    ['NPC Interacted', dashboard.npcInteracted],
    ['Monster Unlocked', dashboard.monsterUnlocked],
    ['Combat Started', dashboard.combatStarted],
    ['Combat Won', dashboard.combatWon],
    ['Combat Lost', dashboard.combatLost],
    ['Reward Claimed', dashboard.rewardClaimed]
  ];
  const rateRows = [
    ['Talk Rate', dashboard.talkRate],
    ['Unlock Rate', dashboard.unlockRate],
    ['Win Rate', dashboard.winRate],
    ['Loss Rate', dashboard.lossRate],
    ['Reward Claim Rate', dashboard.rewardClaimRate]
  ];

  const countHtml = countRows.map(([label, value]) => `
    <div style="display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(132,80,66,0.35);">
      <span style="color: #f3c7b3;">${escapeHtml(label)}</span>
      <span style="color: #fff0e8; font-weight: bold;">${formatMetric(value)}</span>
    </div>
  `).join('');

  const rateHtml = rateRows.map(([label, value]) => `
    <div style="display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(132,80,66,0.35);">
      <span style="color: #f3c7b3;">${escapeHtml(label)}</span>
      <span style="color: #a7f0c2; font-weight: bold;">${formatPercent(value)}</span>
    </div>
  `).join('');

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px;">
      <div style="padding: 12px; border: 1px solid #845042; border-radius: 8px; background: rgba(31, 14, 11, 0.72);">
        <div style="color: #ffe8dc; font-weight: bold; margin-bottom: 8px;">Funnel Counts</div>
        ${countHtml}
      </div>
      <div style="padding: 12px; border: 1px solid #845042; border-radius: 8px; background: rgba(31, 14, 11, 0.72);">
        <div style="color: #ffe8dc; font-weight: bold; margin-bottom: 8px;">Conversion Rates</div>
        ${rateHtml}
      </div>
    </div>
  `;
}
