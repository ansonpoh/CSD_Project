import { EDITOR_LAYOUT, TILE_SIZE } from './constants.js';

const STYLE_ID = 'map-editor-modern-styles';

const TOOLS = [
  ['paint', 'Paint'],
  ['erase', 'Erase'],
  ['fill', 'Fill'],
  ['rect', 'Rect'],
  ['npc_spawn', 'NPC'],
  ['monster_spawn', 'Monster']
];

function buttonMarkup(prefix, value, label) {
  return `<button type="button" class="me-chip" data-${prefix}="${value}">${label}</button>`;
}

export const uiMethods = {
  ensureEditorStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .me-shell {
        position: fixed;
        z-index: 1400;
        pointer-events: none;
        font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
        color: #eef5ff;
      }

      .me-shell * {
        box-sizing: border-box;
      }

      .me-surface {
        position: absolute;
        backdrop-filter: blur(18px);
        background: rgba(8, 16, 31, 0.97);
        border: 1px solid rgba(114, 170, 255, 0.18);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
        pointer-events: auto;
      }

      .me-topbar {
        z-index: 30;
        left: ${EDITOR_LAYOUT.gutter}px;
        right: ${EDITOR_LAYOUT.gutter}px;
        top: ${EDITOR_LAYOUT.gutter}px;
        height: ${EDITOR_LAYOUT.topBarHeight}px;
        border-radius: 26px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        gap: 18px;
        align-items: center;
        padding: 16px 22px;
      }

      .me-brand {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .me-brand__eyebrow {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #8bb5ff;
      }

      .me-brand__title {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.04em;
      }

      .me-brand__meta {
        font-size: 12px;
        color: #9eb6dc;
      }

      .me-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .me-chip-row__label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #7e9cca;
        margin-right: 2px;
      }

      .me-chip,
      .me-action,
      .me-select {
        border: 1px solid rgba(118, 168, 245, 0.2);
        border-radius: 999px;
        background: rgba(18, 34, 64, 0.88);
        color: #e8f2ff;
        font: inherit;
        transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
      }

      .me-chip,
      .me-action {
        cursor: pointer;
      }

      .me-chip:hover,
      .me-action:hover,
      .me-select:hover {
        transform: translateY(-1px);
        border-color: rgba(144, 188, 255, 0.42);
      }

      .me-chip {
        min-height: 40px;
        padding: 0 14px;
        font-size: 13px;
      }

      .me-chip.is-active {
        background: linear-gradient(135deg, rgba(86, 154, 255, 0.95), rgba(65, 117, 239, 0.92));
        border-color: rgba(181, 214, 255, 0.5);
        color: #081221;
        font-weight: 700;
      }

      .me-action {
        min-height: 42px;
        padding: 0 16px;
        font-size: 13px;
        font-weight: 600;
      }

      .me-action--primary {
        background: linear-gradient(135deg, #66d6ff, #6a89ff);
        color: #09101d;
        border-color: rgba(191, 227, 255, 0.64);
      }

      .me-action--success {
        background: linear-gradient(135deg, #52da98, #1aa467);
        color: #091610;
      }

      .me-action--warning {
        background: linear-gradient(135deg, #ffcf71, #f28c35);
        color: #1a1208;
      }

      .me-action--ghost {
        background: rgba(17, 27, 49, 0.65);
      }

      .me-sidebar {
        z-index: 24;
        top: ${EDITOR_LAYOUT.topBarHeight + (EDITOR_LAYOUT.gutter * 2)}px;
        bottom: ${EDITOR_LAYOUT.footerHeight + (EDITOR_LAYOUT.gutter * 2)}px;
        border-radius: 30px;
        overflow: auto;
        padding: 22px;
        background: rgba(8, 16, 31, 0.985);
      }

      .me-sidebar--left {
        left: ${EDITOR_LAYOUT.gutter}px;
        width: ${EDITOR_LAYOUT.leftPanelWidth}px;
        transition: width 180ms ease, padding 180ms ease;
      }

      .me-sidebar--right {
        right: ${EDITOR_LAYOUT.gutter}px;
        width: ${EDITOR_LAYOUT.rightPanelWidth}px;
        transition: transform 180ms ease, opacity 180ms ease;
      }

      .me-shell.is-right-collapsed .me-sidebar--right {
        transform: translateX(calc(100% + 16px));
        opacity: 0;
        pointer-events: none;
      }

      .me-sidebar__section + .me-sidebar__section {
        margin-top: 22px;
      }

      .me-shell.is-left-collapsed .me-sidebar--left {
        width: ${EDITOR_LAYOUT.leftPanelCollapsedWidth}px;
        padding-left: 14px;
        padding-right: 14px;
      }

      .me-shell.is-left-collapsed .me-sidebar--left .me-sidebar__section:not(.me-sidebar__section--pin) {
        display: none;
      }

      .me-shell.is-left-collapsed .me-sidebar--left .me-sidebar__headline {
        margin-bottom: 0;
      }

      .me-shell.is-left-collapsed .me-sidebar--left .me-sidebar__title {
        margin-bottom: 0;
      }

      .me-shell.is-left-collapsed .me-sidebar--left .me-sidebar__headline h3 {
        display: none;
      }

      .me-shell.is-left-collapsed .me-sidebar--left .me-copy {
        display: none;
      }

      .me-sidebar__title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #84a6d5;
        margin-bottom: 10px;
      }

      .me-sidebar__headline {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
      }

      .me-sidebar__headline h3 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.03em;
      }

      .me-copy {
        color: #a6badc;
        line-height: 1.55;
        font-size: 14px;
      }

      .me-form {
        display: grid;
        gap: 12px;
      }

      .me-field {
        display: grid;
        gap: 6px;
      }

      .me-field label {
        font-size: 12px;
        color: #8fa8cf;
      }

      .me-input,
      .me-textarea,
      .me-select {
        width: 100%;
        min-height: 44px;
        padding: 12px 14px;
        background: rgba(10, 18, 35, 0.95);
        color: #edf5ff;
        border: 1px solid rgba(108, 153, 226, 0.22);
        border-radius: 16px;
        outline: none;
      }

      .me-textarea {
        min-height: 112px;
        resize: vertical;
      }

      .me-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .me-stat {
        padding: 14px;
        border-radius: 18px;
        background: rgba(15, 25, 46, 0.82);
        border: 1px solid rgba(103, 147, 216, 0.14);
      }

      .me-stat__label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #8ba3c9;
      }

      .me-stat__value {
        display: block;
        margin-top: 8px;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.04em;
      }

      .me-stat__value--small {
        font-size: 13px;
        line-height: 1.35;
        word-break: break-word;
      }

      .me-help {
        display: grid;
        gap: 10px;
      }

      .me-help__row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 13px;
      }

      .me-help__row:last-child {
        padding-bottom: 0;
        border-bottom: none;
      }

      .me-help__row span:first-child {
        color: #8fa8cf;
      }

      .me-workspace {
        position: absolute;
        z-index: 8;
        pointer-events: none;
        border-radius: 0;
        border: 1px solid rgba(128, 182, 255, 0.14);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        overflow: hidden;
        background: transparent;
      }

      .me-workspace::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(180deg, rgba(117, 170, 255, 0.04), transparent 18%),
          radial-gradient(circle at top right, rgba(102, 214, 255, 0.05), transparent 24%);
      }

      .me-workspace__grid {
        position: absolute;
        display: none !important;
        border: 1px solid rgba(149, 186, 255, 0.18);
        background-color: transparent;
        box-shadow: none;
      }

      .me-workspace__hover {
        position: absolute;
        display: none;
        border: 2px solid rgba(100, 210, 255, 0.95);
        background: rgba(100, 210, 255, 0.12);
      }

      .me-workspace__hover--rect {
        border-color: rgba(246, 197, 99, 0.98);
        background: rgba(246, 197, 99, 0.12);
      }

      .me-workspace__label {
        z-index: 3;
        position: absolute;
        top: 18px;
        left: 20px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(8, 13, 25, 0.72);
        color: #d8e9ff;
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .me-workspace__sub {
        z-index: 3;
        position: absolute;
        right: 20px;
        top: 18px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(8, 13, 25, 0.72);
        color: #9db9df;
        font-size: 12px;
      }

      .me-footer {
        z-index: 28;
        left: ${EDITOR_LAYOUT.gutter}px;
        right: ${EDITOR_LAYOUT.gutter}px;
        bottom: ${EDITOR_LAYOUT.gutter}px;
        height: ${EDITOR_LAYOUT.footerHeight}px;
        border-radius: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 18px;
      }

      .me-footer__status {
        font-size: 13px;
        color: #e9f3ff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .me-footer__meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .me-pill {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(16, 26, 49, 0.75);
        border: 1px solid rgba(112, 160, 236, 0.14);
        color: #a9c3e8;
        font-size: 12px;
      }

      .me-preview {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 14px;
        align-items: center;
      }

      .me-preview__canvas {
        width: 112px;
        height: 112px;
        border-radius: 18px;
        background: #07101f;
        border: 1px solid rgba(122, 169, 241, 0.18);
        image-rendering: pixelated;
      }

      .me-preview__meta {
        display: grid;
        gap: 8px;
      }

      .me-tileset-switch {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .me-tileset-switch__name {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        color: #d9e9ff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .me-palette {
        min-height: 320px;
        max-height: calc(100vh - 420px);
        overflow: auto;
        padding-right: 6px;
      }

      .me-palette__grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .me-palette__button {
        position: relative;
        aspect-ratio: 1;
        border-radius: 18px;
        border: 1px solid rgba(107, 154, 229, 0.16);
        background: rgba(13, 22, 41, 0.9);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
      }

      .me-palette__button:hover {
        transform: translateY(-1px);
        border-color: rgba(147, 192, 255, 0.34);
      }

      .me-palette__button.is-active {
        border-color: rgba(245, 189, 87, 0.78);
        box-shadow: 0 0 0 2px rgba(245, 189, 87, 0.14);
      }

      .me-palette__canvas {
        width: 58px;
        height: 58px;
        image-rendering: pixelated;
      }

      .me-palette__index {
        position: absolute;
        bottom: 8px;
        right: 9px;
        font-size: 10px;
        color: #8fb0dc;
      }

      .me-modal-host {
        position: absolute;
        inset: 0;
        z-index: 40;
        pointer-events: none;
      }

      .me-sidebar__toggle {
        width: 42px;
        min-width: 42px;
        padding: 0;
      }

      .me-edge-tab {
        position: absolute;
        z-index: 26;
        pointer-events: auto;
        display: none;
      }

      .me-edge-tab--right {
        right: ${EDITOR_LAYOUT.gutter}px;
        top: 50%;
        transform: translateY(-50%);
        min-height: 48px;
        padding: 0 16px;
      }

      .me-shell.is-right-collapsed .me-edge-tab--right {
        display: block;
      }

      .me-workspace__zoom {
        position: absolute;
        right: 18px;
        bottom: 18px;
        z-index: 4;
        display: flex;
        gap: 10px;
        pointer-events: auto;
      }

      .me-modal-host.is-open {
        pointer-events: auto;
      }

      .me-modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(1, 4, 10, 0.64);
      }

      .me-modal {
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(760px, calc(100vw - 80px));
        max-height: min(78vh, 760px);
        transform: translate(-50%, -50%);
        overflow: auto;
        border-radius: 28px;
        padding: 22px;
      }

      .me-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .me-modal__header h3 {
        margin: 0;
        font-size: 24px;
        letter-spacing: -0.04em;
      }

      .me-modal__list {
        display: grid;
        gap: 12px;
      }

      .me-draft-card {
        width: 100%;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(109, 158, 236, 0.16);
        background: rgba(15, 24, 44, 0.88);
        text-align: left;
        color: #edf5ff;
        cursor: pointer;
      }

      .me-draft-card__title {
        font-size: 17px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .me-draft-card__body {
        font-size: 14px;
        color: #a6badc;
        margin-bottom: 10px;
      }

      .me-draft-card__meta {
        font-size: 12px;
        color: #86a4d2;
      }

      @media (max-width: 1280px) {
        .me-topbar {
          grid-template-columns: 1fr;
          height: auto;
        }

        .me-sidebar--left,
        .me-sidebar--right,
        .me-workspace,
        .me-footer {
          position: relative;
          left: auto;
          right: auto;
          top: auto;
          bottom: auto;
          width: auto;
          height: auto;
          margin: 0 ${EDITOR_LAYOUT.gutter}px ${EDITOR_LAYOUT.gutter}px;
        }

        .me-sidebar {
          overflow: visible;
        }

        .me-shell {
          overflow: auto;
        }
      }
    `;

    document.head.appendChild(style);
  },

  createToolbar() {
    this.ensureEditorStyles();

    const root = document.createElement('div');
    root.className = 'me-shell';
    root.innerHTML = `
      <div class="me-surface me-topbar">
        <div class="me-brand">
          <span class="me-brand__eyebrow">Creator Tools</span>
          <span class="me-brand__title">Map Maker</span>
          <span class="me-brand__meta" id="me-top-meta">Build, paint, place encounters, and publish without fighting the UI.</span>
        </div>
        <div class="me-chip-row">
          <span class="me-chip-row__label">Tool</span>
          <div class="me-chip-row" id="me-tool-row">${TOOLS.map(([value, label]) => buttonMarkup('tool', value, label)).join('')}</div>
        </div>
        <div class="me-chip-row">
          <span class="me-chip-row__label">Layer</span>
          <div class="me-chip-row" id="me-layer-row">${this.layerNames.map((layer) => buttonMarkup('layer', layer, layer)).join('')}</div>
        </div>
        <div class="me-chip-row">
          <button type="button" class="me-action me-action--ghost" id="me-undo">Undo</button>
          <button type="button" class="me-action me-action--ghost" id="me-redo">Redo</button>
        </div>
      </div>

      <aside class="me-surface me-sidebar me-sidebar--left">
        <section class="me-sidebar__section me-sidebar__section--pin">
          <div class="me-sidebar__headline">
            <div>
              <div class="me-sidebar__title">Map Details</div>
              <h3>Shape the experience</h3>
            </div>
            <button type="button" class="me-action me-action--ghost me-sidebar__toggle" id="me-toggle-left" aria-label="Toggle details panel"><<</button>
          </div>
          <p class="me-copy">Keep the map clean, readable, and encounter-ready. The canvas in the middle is now a dedicated workspace, so panels no longer fight with the tiles.</p>
        </section>

        <section class="me-sidebar__section">
          <div class="me-form">
            <div class="me-field">
              <label for="me-name">Map name</label>
              <input id="me-name" class="me-input" placeholder="Forgotten Orchard" />
            </div>
            <div class="me-field">
              <label for="me-bio">Biome</label>
              <input id="me-bio" class="me-input" placeholder="Forest, city, ruins..." />
            </div>
            <div class="me-field">
              <label for="me-diff">Difficulty</label>
              <input id="me-diff" class="me-input" placeholder="easy / medium / hard" />
            </div>
            <div class="me-field">
              <label for="me-desc">Description</label>
              <textarea id="me-desc" class="me-textarea" placeholder="Summarize the learner journey, pacing, and encounter mood."></textarea>
            </div>
          </div>
        </section>

        <section class="me-sidebar__section">
          <div class="me-sidebar__title">Actions</div>
          <div class="me-chip-row">
            <button type="button" class="me-action me-action--success" id="me-save">Save Draft</button>
            <button type="button" class="me-action me-action--ghost" id="me-load">Load Draft</button>
          </div>
          <div class="me-chip-row" style="margin-top:10px;">
            <button type="button" class="me-action me-action--warning" id="me-publish">Publish</button>
            <button type="button" class="me-action me-action--ghost" id="me-play">Play-test</button>
            <button type="button" class="me-action me-action--ghost" id="me-back">Back</button>
          </div>
        </section>

        <section class="me-sidebar__section">
          <div class="me-sidebar__title">Snapshot</div>
          <div class="me-stats">
            <div class="me-stat">
              <span class="me-stat__label">Map size</span>
              <span class="me-stat__value" id="me-stat-size">80 x 45</span>
            </div>
            <div class="me-stat">
              <span class="me-stat__label">Zoom</span>
              <span class="me-stat__value" id="me-stat-zoom">100%</span>
            </div>
            <div class="me-stat">
              <span class="me-stat__label">NPCs</span>
              <span class="me-stat__value" id="me-stat-npcs">0</span>
            </div>
            <div class="me-stat">
              <span class="me-stat__label">Monsters</span>
              <span class="me-stat__value" id="me-stat-monsters">0</span>
            </div>
            <div class="me-stat" style="grid-column: 1 / -1;">
              <span class="me-stat__label">Draft</span>
              <span class="me-stat__value me-stat__value--small" id="me-stat-draft">Unsaved draft</span>
            </div>
          </div>
        </section>

        <section class="me-sidebar__section">
          <div class="me-sidebar__title">Quick Guide</div>
          <div class="me-help">
            <div class="me-help__row"><span>Paint / Erase</span><strong>Left click or drag</strong></div>
            <div class="me-help__row"><span>Pan camera</span><strong>Right click drag or two-finger scroll</strong></div>
            <div class="me-help__row"><span>Zoom</span><strong>Use +/- or Fit</strong></div>
            <div class="me-help__row"><span>Layer hotkeys</span><strong>1 / 2 / 3</strong></div>
            <div class="me-help__row"><span>History</span><strong>Ctrl/Cmd+Z, Ctrl/Cmd+Y</strong></div>
          </div>
        </section>
      </aside>

      <aside class="me-surface me-sidebar me-sidebar--right">
        <section class="me-sidebar__section me-sidebar__section--pin">
          <div class="me-sidebar__headline">
            <div>
              <div class="me-sidebar__title">Tile Palette</div>
              <h3>Choose a tile</h3>
            </div>
            <button type="button" class="me-action me-action--ghost me-sidebar__toggle" id="me-toggle-right" aria-label="Toggle tile palette">>></button>
          </div>
          <div class="me-preview">
            <canvas id="me-preview-canvas" class="me-preview__canvas" width="96" height="96"></canvas>
            <div class="me-preview__meta">
              <strong id="me-selected-tile-label">Tile #0</strong>
              <span class="me-copy" id="me-selected-layer-label">Painting ground layer</span>
              <span class="me-copy" id="me-selected-tool-label">Tool: Paint</span>
            </div>
          </div>
        </section>

        <section class="me-sidebar__section">
          <div class="me-sidebar__title">Tileset</div>
          <div class="me-tileset-switch">
            <button type="button" class="me-action me-action--ghost" id="me-prev-tileset">Prev</button>
            <div class="me-tileset-switch__name" id="me-tileset-name">${this.tilesetKey}</div>
            <button type="button" class="me-action me-action--ghost" id="me-next-tileset">Next</button>
          </div>
        </section>

        <section class="me-sidebar__section">
          <div class="me-sidebar__title">Visible Tiles</div>
          <div class="me-palette" id="me-palette-scroll">
            <div class="me-palette__grid" id="me-palette-grid"></div>
          </div>
        </section>
      </aside>

      <button type="button" class="me-action me-action--ghost me-edge-tab me-edge-tab--right" id="me-toggle-right-tab" aria-label="Show tile palette">Show Palette</button>

      <div class="me-workspace" id="me-workspace">
        <div class="me-workspace__grid" id="me-workspace-grid"></div>
        <div class="me-workspace__hover" id="me-hover-box"></div>
        <div class="me-workspace__label">Canvas Workspace</div>
        <div class="me-workspace__sub" id="me-workspace-meta">Rounded zoom for cleaner squares</div>
        <div class="me-workspace__zoom">
          <button type="button" class="me-action me-action--ghost" id="me-fit-map">Fit</button>
          <button type="button" class="me-action me-action--ghost" id="me-zoom-out">-</button>
          <button type="button" class="me-action me-action--ghost" id="me-zoom-in">+</button>
        </div>
      </div>

      <div class="me-surface me-footer">
        <div class="me-footer__status" id="me-status">${this.lastStatusMessage}</div>
        <div class="me-footer__meta">
          <span class="me-pill" id="me-coords">Tile -, -</span>
          <span class="me-pill" id="me-active-mode">paint / ground</span>
          <span class="me-pill" id="me-tile-count">Tile #0</span>
        </div>
      </div>

      <div class="me-modal-host" id="me-modal-host"></div>
    `;

    document.body.appendChild(root);
    this.editorRoot = root;
    this.editorFormEl = root;
    this.modalHostEl = root.querySelector('#me-modal-host');
    this.statusText = root.querySelector('#me-status');
    this.selectedPreview = root.querySelector('#me-preview-canvas');
    this.selectedTileText = root.querySelector('#me-selected-tile-label');
    this.tilesetLabel = root.querySelector('#me-tileset-name');
    this.paletteGridEl = root.querySelector('#me-palette-grid');
    this.workspaceEl = root.querySelector('#me-workspace');
    this.workspaceGridEl = root.querySelector('#me-workspace-grid');
    this.hoverBoxEl = root.querySelector('#me-hover-box');

    const bindClick = (selector, handler) => {
      root.querySelector(selector)?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler(event);
      });
    };

    root.querySelectorAll('[data-tool]').forEach((button) => {
      button.addEventListener('click', () => {
        this.activeTool = button.getAttribute('data-tool');
        this.rectStart = null;
        this.refreshToolbarLabel();
      });
    });

    root.querySelectorAll('[data-layer]').forEach((button) => {
      button.addEventListener('click', () => {
        this.activeLayer = button.getAttribute('data-layer');
        this.refreshToolbarLabel();
      });
    });

    bindClick('#me-undo', () => this.undo());
    bindClick('#me-redo', () => this.redo());
    bindClick('#me-save', () => this.saveDraft());
    bindClick('#me-load', () => this.openLoadDraftModal());
    bindClick('#me-publish', () => this.publishDraft());
    bindClick('#me-play', () => this.playTest());
    bindClick('#me-back', () => this.scene.start('ContributorScene'));
    bindClick('#me-prev-tileset', () => this.switchTileset(-1));
    bindClick('#me-next-tileset', () => this.switchTileset(1));
    bindClick('#me-toggle-left', () => this.toggleLeftSidebar());
    bindClick('#me-toggle-right', () => this.toggleRightSidebar());
    bindClick('#me-toggle-right-tab', () => this.toggleRightSidebar());
    bindClick('#me-fit-map', () => this.fitMapToViewport());
    bindClick('#me-zoom-out', () => this.zoomByStep(1 / 1.14));
    bindClick('#me-zoom-in', () => this.zoomByStep(1.14));

    this.refreshEditorLayout();
    this.refreshToolbarLabel();
    this.refreshStatusMeta();
  },

  createEditorForm() {
    if (!this.editorRoot) {
      this.createToolbar();
    }
  },

  createStatusLine() {
    this.refreshStatusMeta();
  },

  refreshEditorLayout() {
    if (!this.editorRoot) return;

    const cam = this.cameras.main;
    const canvas = this.game.canvas;
    const canvasBounds = canvas?.getBoundingClientRect?.();
    const gutter = EDITOR_LAYOUT.gutter;
    const leftWidth = this.leftSidebarCollapsed ? EDITOR_LAYOUT.leftPanelCollapsedWidth : EDITOR_LAYOUT.leftPanelWidth;
    const rightWidth = this.rightSidebarCollapsed ? 0 : EDITOR_LAYOUT.rightPanelWidth;
    const rootLeft = canvasBounds?.left ?? 0;
    const rootTop = canvasBounds?.top ?? 0;
    const rootWidth = canvasBounds?.width ?? window.innerWidth;
    const rootHeight = canvasBounds?.height ?? window.innerHeight;
    const screenX = gutter + leftWidth + gutter;
    const screenY = gutter + EDITOR_LAYOUT.topBarHeight + gutter;
    const screenWidth = Math.max(
      280,
      rootWidth - leftWidth - rightWidth - (gutter * 4)
    );
    const screenHeight = Math.max(
      260,
      rootHeight - EDITOR_LAYOUT.topBarHeight - EDITOR_LAYOUT.footerHeight - (gutter * 4)
    );

    this.editorRoot.style.left = `${rootLeft}px`;
    this.editorRoot.style.top = `${rootTop}px`;
    this.editorRoot.style.width = `${rootWidth}px`;
    this.editorRoot.style.height = `${rootHeight}px`;

    this.workspaceScreenRect = { x: screenX, y: screenY, width: screenWidth, height: screenHeight };

    this.editorRoot.classList.toggle('is-left-collapsed', this.leftSidebarCollapsed);
    this.editorRoot.classList.toggle('is-right-collapsed', this.rightSidebarCollapsed);
    const toggleBtn = this.editorRoot.querySelector('#me-toggle-left');
    if (toggleBtn) {
      toggleBtn.textContent = this.leftSidebarCollapsed ? '>>' : '<<';
    }
    const rightToggleBtn = this.editorRoot.querySelector('#me-toggle-right');
    if (rightToggleBtn) {
      rightToggleBtn.textContent = this.rightSidebarCollapsed ? '<<' : '>>';
    }

    if (rootWidth && rootHeight) {
      const gameWidth = this.scale.width || Number(this.game.config.width) || canvas.width;
      const gameHeight = this.scale.height || Number(this.game.config.height) || canvas.height;
      const scaleX = gameWidth / rootWidth;
      const scaleY = gameHeight / rootHeight;

      const gameX = Phaser.Math.Clamp(screenX * scaleX, 0, gameWidth - 1);
      const gameY = Phaser.Math.Clamp(screenY * scaleY, 0, gameHeight - 1);
      const gameWidthRect = Phaser.Math.Clamp(screenWidth * scaleX, 1, gameWidth - gameX);
      const gameHeightRect = Phaser.Math.Clamp(screenHeight * scaleY, 1, gameHeight - gameY);

      this.viewportRect = {
        x: gameX,
        y: gameY,
        width: gameWidthRect,
        height: gameHeightRect
      };
      cam.setViewport(gameX, gameY, gameWidthRect, gameHeightRect);
    } else {
      this.viewportRect = {
        x: screenX,
        y: screenY,
        width: screenWidth,
        height: screenHeight
      };
      cam.setViewport(screenX, screenY, screenWidth, screenHeight);
    }
    cam.roundPixels = true;

    if (this.workspaceEl) {
      this.workspaceEl.style.left = `${screenX}px`;
      this.workspaceEl.style.top = `${screenY}px`;
      this.workspaceEl.style.width = `${screenWidth}px`;
      this.workspaceEl.style.height = `${screenHeight}px`;
    }
    this.refreshWorkspaceOverlay();
  },

  toggleLeftSidebar() {
    this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
    this.refreshEditorLayout();
    this.fitMapToViewport();
  },

  toggleRightSidebar() {
    this.rightSidebarCollapsed = !this.rightSidebarCollapsed;
    this.refreshEditorLayout();
    this.fitMapToViewport();
  },

  fitMapToViewport() {
    this.resetCameraView?.();
    this.refreshWorkspaceOverlay?.();
    this.refreshStatusMeta?.();
  },

  zoomByStep(factor) {
    const cam = this.cameras.main;
    const center = {
      x: this.viewportRect ? this.viewportRect.x + (this.viewportRect.width / 2) : cam.centerX,
      y: this.viewportRect ? this.viewportRect.y + (this.viewportRect.height / 2) : cam.centerY
    };
    this.zoomAtPointer(center, factor > 1 ? -120 : 120);
  },

  refreshToolbarLabel() {
    if (!this.editorRoot) return;

    this.editorRoot.querySelectorAll('[data-tool]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-tool') === this.activeTool);
    });
    this.editorRoot.querySelectorAll('[data-layer]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-layer') === this.activeLayer);
    });

    const toolLabel = TOOLS.find(([value]) => value === this.activeTool)?.[1] || this.activeTool;
    const layerLabel = this.activeLayer.charAt(0).toUpperCase() + this.activeLayer.slice(1);

    const topMeta = this.editorRoot.querySelector('#me-top-meta');
    const layerMeta = this.editorRoot.querySelector('#me-selected-layer-label');
    const toolMeta = this.editorRoot.querySelector('#me-selected-tool-label');
    const activeMode = this.editorRoot.querySelector('#me-active-mode');

    if (topMeta) topMeta.textContent = `Working on the ${layerLabel.toLowerCase()} layer with the ${toolLabel.toLowerCase()} tool.`;
    if (layerMeta) layerMeta.textContent = `Painting ${layerLabel.toLowerCase()} layer`;
    if (toolMeta) toolMeta.textContent = `Tool: ${toolLabel}`;
    if (activeMode) activeMode.textContent = `${toolLabel.toLowerCase()} / ${layerLabel.toLowerCase()}`;

    this.refreshStatusMeta();
  },

  refreshStatusMeta() {
    if (!this.editorRoot) return;

    const zoomValue = Math.round((this.cameras.main.zoom || 1) * 100);
    const hovered = this.hoveredTile ? `${this.hoveredTile.x}, ${this.hoveredTile.y}` : '-, -';

    const mapSize = this.editorRoot.querySelector('#me-stat-size');
    const zoomEl = this.editorRoot.querySelector('#me-stat-zoom');
    const npcEl = this.editorRoot.querySelector('#me-stat-npcs');
    const monsterEl = this.editorRoot.querySelector('#me-stat-monsters');
    const draftEl = this.editorRoot.querySelector('#me-stat-draft');
    const coordsEl = this.editorRoot.querySelector('#me-coords');
    const tileCountEl = this.editorRoot.querySelector('#me-tile-count');
    const workspaceMeta = this.editorRoot.querySelector('#me-workspace-meta');

    if (mapSize) mapSize.textContent = `${this.mapWidth} x ${this.mapHeight}`;
    if (zoomEl) zoomEl.textContent = `${zoomValue}%`;
    if (npcEl) npcEl.textContent = String(this.markers.npcs.length);
    if (monsterEl) monsterEl.textContent = String(this.markers.monsters.length);
    if (draftEl) draftEl.textContent = this.currentDraftId || 'Unsaved draft';
    if (coordsEl) coordsEl.textContent = `Tile ${hovered}`;
    if (tileCountEl) tileCountEl.textContent = `Tile #${this.selectedTile}`;
    if (workspaceMeta) {
      workspaceMeta.textContent = zoomValue <= Math.round(this.minZoom * 100) + 1
        ? `Whole map fit at ${zoomValue}%`
        : `Zoom ${zoomValue}% for closer editing`;
    }
  },

  refreshWorkspaceOverlay() {
    if (this.workspaceGridEl) {
      this.workspaceGridEl.style.display = 'none';
    }
    this.refreshHoverOverlay(false);
  },

  refreshHoverOverlay(show = false) {
    if (!this.hoverBoxEl || !this.viewportRect) return;
    if (!show) {
      this.hoverBoxEl.style.display = 'none';
      return;
    }

    const cam = this.cameras.main;
    const zoom = cam.zoom;

    const renderBox = (left, top, width, height, className = '') => {
      const clippedLeft = Math.max(0, left);
      const clippedTop = Math.max(0, top);
      const clippedRight = Math.min(this.viewportRect.width, left + width);
      const clippedBottom = Math.min(this.viewportRect.height, top + height);
      if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
        this.hoverBoxEl.style.display = 'none';
        return;
      }

      this.hoverBoxEl.className = `me-workspace__hover ${className}`.trim();
      this.hoverBoxEl.style.display = 'block';
      this.hoverBoxEl.style.left = `${clippedLeft}px`;
      this.hoverBoxEl.style.top = `${clippedTop}px`;
      this.hoverBoxEl.style.width = `${clippedRight - clippedLeft}px`;
      this.hoverBoxEl.style.height = `${clippedBottom - clippedTop}px`;
    };

    if (this.rectStart && this.hoveredTile) {
      const minX = Math.min(this.rectStart.x, this.hoveredTile.x);
      const minY = Math.min(this.rectStart.y, this.hoveredTile.y);
      const maxX = Math.max(this.rectStart.x, this.hoveredTile.x);
      const maxY = Math.max(this.rectStart.y, this.hoveredTile.y);
      renderBox(
        (minX * TILE_SIZE - cam.scrollX) * zoom,
        (minY * TILE_SIZE - cam.scrollY) * zoom,
        (maxX - minX + 1) * TILE_SIZE * zoom,
        (maxY - minY + 1) * TILE_SIZE * zoom,
        'me-workspace__hover--rect'
      );
      return;
    }

    if (!this.hoveredTile) {
      this.hoverBoxEl.style.display = 'none';
      return;
    }

    renderBox(
      (this.hoveredTile.x * TILE_SIZE - cam.scrollX) * zoom,
      (this.hoveredTile.y * TILE_SIZE - cam.scrollY) * zoom,
      TILE_SIZE * zoom,
      TILE_SIZE * zoom
    );
  },

  setStatus(message) {
    this.lastStatusMessage = message;
    if (this.statusText) this.statusText.textContent = message;
  },

  getFormValue(selector) {
    return this.editorFormEl?.querySelector(selector)?.value?.trim() || '';
  },

  setFormValue(selector, value) {
    const element = this.editorFormEl?.querySelector(selector);
    if (element) element.value = value || '';
  },

  cleanupDom() {
    if (this.uiModal?.parentNode) this.uiModal.parentNode.removeChild(this.uiModal);
    this.uiModal = null;
    this.modalHostEl = null;
    if (this.editorRoot?.parentNode) this.editorRoot.parentNode.removeChild(this.editorRoot);
    this.editorRoot = null;
    this.editorFormEl = null;
    this.statusText = null;
    this.selectedPreview = null;
    this.selectedTileText = null;
    this.tilesetLabel = null;
    this.paletteGridEl = null;
    this.workspaceEl = null;
    this.workspaceGridEl = null;
    this.hoverBoxEl = null;
    this.paletteButtons = [];
    this.currentTilesetInfo = null;
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
