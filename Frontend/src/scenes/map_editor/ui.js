export const uiMethods = {
  createToolbar() {
    const { width } = this.cameras.main;
    const bar = this.add.rectangle(width / 2, 30, width - 22, 52, 0x0b1320, 0.88).setScrollFactor(0).setDepth(100);
    bar.setStrokeStyle(2, 0x33527a, 1);

    const tools = [
      ['paint', 'Paint'],
      ['erase', 'Erase'],
      ['fill', 'Fill'],
      ['rect', 'Rect'],
      ['npc_spawn', 'NPC'],
      ['monster_spawn', 'Monster']
    ];

    this.toolButtons = [];
    tools.forEach(([id, label], index) => {
      const x = 78 + index * 92;
      const button = this.add.rectangle(x, 30, 84, 30, 0x1f344f, 1)
        .setScrollFactor(0)
        .setDepth(101)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, 30, label, { fontSize: '12px', color: '#dfeeff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(102);
      button.on('pointerdown', () => {
        this.activeTool = id;
        this.rectStart = null;
        this.refreshToolbarLabel();
      });
      this.toolButtons.push({ id, btn: button });
    });

    this.add.text(700, 30, 'Layers', {
      fontSize: '12px',
      color: '#9ec1e7'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    this.layerButtons = this.layerNames.map((layer, index) => {
      const x = 790 + index * 102;
      const button = this.add.rectangle(x, 30, 96, 30, 0x1b2f4a, 1)
        .setScrollFactor(0)
        .setDepth(101)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, 30, layer.toUpperCase(), { fontSize: '11px', color: '#d8e9ff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(102);
      button.on('pointerdown', () => {
        this.activeLayer = layer;
        this.refreshToolbarLabel();
      });
      return { layer, btn: button };
    });

    this.undoBtn = this.add.rectangle(1130, 30, 64, 30, 0x1f344f, 1)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    this.add.text(1130, 30, 'Undo', { fontSize: '12px', color: '#dfeeff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);
    this.undoBtn.on('pointerdown', () => this.undo());

    this.redoBtn = this.add.rectangle(1204, 30, 64, 30, 0x1f344f, 1)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    this.add.text(1204, 30, 'Redo', { fontSize: '12px', color: '#dfeeff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);
    this.redoBtn.on('pointerdown', () => this.redo());

    this.refreshToolbarLabel();
  },

  refreshToolbarLabel() {
    this.toolButtons?.forEach(({ id, btn }) => {
      btn.setFillStyle(this.activeTool === id ? 0x2a7fb5 : 0x1f344f, 1);
    });
    this.layerButtons?.forEach(({ layer, btn }) => {
      btn.setFillStyle(this.activeLayer === layer ? 0x2d5b90 : 0x1b2f4a, 1);
    });
  },

  createEditorForm() {
    const form = document.createElement('div');
    form.style.position = 'absolute';
    form.style.left = '16px';
    form.style.top = '84px';
    form.style.width = '340px';
    form.style.padding = '12px';
    form.style.background = 'rgba(7, 18, 35, 0.95)';
    form.style.border = '1px solid #36547c';
    form.style.borderRadius = '8px';
    form.style.zIndex = '1000';
    form.innerHTML = `
      <div style="color:#e5f0ff;font-weight:700;margin-bottom:8px;">Map Editor</div>
      <input id="me-name" placeholder="Map Name" style="width:100%;margin-bottom:6px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;" />
      <input id="me-bio" placeholder="Biome (e.g. forest)" style="width:100%;margin-bottom:6px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;" />
      <input id="me-diff" placeholder="Difficulty (easy/med/hard)" style="width:100%;margin-bottom:6px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;" />
      <textarea id="me-desc" rows="3" placeholder="Description" style="width:100%;margin-bottom:8px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;resize:vertical;"></textarea>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button id="me-save" style="flex:1;min-width:98px;padding:8px 10px;background:#14532d;color:#eaffef;border:1px solid #3d8f63;border-radius:4px;cursor:pointer;">Save Draft</button>
        <button id="me-load" style="flex:1;min-width:98px;padding:8px 10px;background:#1e3a8a;color:#e9f1ff;border:1px solid #4f6ec2;border-radius:4px;cursor:pointer;">Load Draft</button>
        <button id="me-publish" style="flex:1;min-width:98px;padding:8px 10px;background:#7c2d12;color:#fff1e9;border:1px solid #bd6f54;border-radius:4px;cursor:pointer;">Publish</button>
        <button id="me-play" style="flex:1;min-width:98px;padding:8px 10px;background:#2d3748;color:#edf2ff;border:1px solid #66758f;border-radius:4px;cursor:pointer;">Play-test</button>
        <button id="me-back" style="flex:1;min-width:98px;padding:8px 10px;background:#4b1d1d;color:#ffe8e8;border:1px solid #9d6666;border-radius:4px;cursor:pointer;">Back</button>
      </div>
    `;
    document.body.appendChild(form);
    this.editorFormEl = form;

    const bindClick = (selector, handler) => {
      form.querySelector(selector)?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler();
      });
    };

    bindClick('#me-save', () => this.saveDraft());
    bindClick('#me-load', () => this.openLoadDraftModal());
    bindClick('#me-publish', () => this.publishDraft());
    bindClick('#me-play', () => this.playTest());
    bindClick('#me-back', () => this.scene.start('ContributorScene'));
  },

  createStatusLine() {
    this.statusText = this.add.text(
      16,
      this.cameras.main.height - 24,
      'LMB draw | RMB/Middle drag camera | Wheel zoom | Z/Y undo/redo | 1/2/3 layer',
      { fontSize: '12px', color: '#b7cde8' }
    ).setScrollFactor(0).setDepth(200);
  },

  setStatus(message) {
    if (this.statusText) this.statusText.setText(message);
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
    if (this.editorFormEl?.parentNode) this.editorFormEl.parentNode.removeChild(this.editorFormEl);
    this.editorFormEl = null;
    this.paletteMask = null;
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
