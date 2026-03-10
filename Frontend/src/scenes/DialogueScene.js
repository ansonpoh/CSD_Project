import Phaser from 'phaser';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';
import { apiService } from '../services/api';
import { gameState } from '../services/gameState';
import { dailyQuestService } from '../services/dailyQuests.js';

const P = {
  bgDeep:     0x090f24,
  bgPanel:    0x080e22,
  bgPortrait: 0x0d1a30,
  bgDialogue: 0x08102a,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  borderBlue: 0x2a5090,
  borderDim:  0x604008,
  accentGlow: 0xffdd60,
  btnNormal:  0x2a0f42,
  btnHover:   0x3d1860,
  btnPress:   0x100520,
  textMain:   '#f0ecff',
  textSub:    '#c0a8e0',
  textGold:   '#f4c048',
  textTitle:  '#9fd0ff',
  textDim:    '#5a4a72',
};

export class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogueScene' });
    this.npc = null;
    this.pageIndex = 0;
    this.lessonPages = [];
    this.lessonTitleText = null;
    this.lessonBodyText = null;
    this.pageIndicatorText = null;
    this.dialogueText = null;
    this.isTyping = false;
    this.typingTimer = null;
    this.fullCurrentText = '';
    this.lessonVideo = null;
    this.lessonPanelBox = null;
    this.videoUi = [];
    this.videoTimeText = null;
    this.videoTicker = null;
    this.lessonKey = null;
    this.visitedPages = new Set();
    this.renderRequestId = 0;
    this.reportModal = null;
    this.reportButton = null;
  }

  init(data) {
    this.npc = data.npc;
    this.dialogueIndex = 0;
    this.pageIndex = 0;
    this.lessonPages = data.lessonPages;
    this.lessonKey = data.lessonKey || null;
    this.visitedPages = new Set();
  }

  create() {
    this.events.once('shutdown', () => {
      this.destroyReportModal();
      this.clearLessonMedia();
      this.input.keyboard.off('keydown-RIGHT', this.handleRightKey);
      this.input.keyboard.off('keydown-LEFT', this.handleLeftKey);
      this.input.keyboard.off('keydown-SPACE', this.handleSpaceKey);
    });
    this.events.once('destroy', () => {
      this.destroyReportModal();
      this.clearLessonMedia();
      this.input.keyboard.off('keydown-RIGHT', this.handleRightKey);
      this.input.keyboard.off('keydown-LEFT', this.handleLeftKey);
      this.input.keyboard.off('keydown-SPACE', this.handleSpaceKey);
    });

    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Dark overlay ──────────────────────────────────────────────────────
    this.add.rectangle(0, 0, width, height, 0x000000, 0.78).setOrigin(0);

    // ── Layout math (unchanged values) ────────────────────────────────────
    const narrationH   = 200;
    const narrationY   = height - 150;
    const narrationTop = narrationY - narrationH / 2;
    const lessonH      = Math.min(520, height * 0.5);
    const lessonY      = (narrationTop - 50) - lessonH / 2;
    const lessonW      = Math.min(1100, width - 240);

    this.lessonPanelBox = { x: width / 2, y: lessonY, w: lessonW, h: lessonH };

    // ── Lesson panel ──────────────────────────────────────────────────────
    const lp = this.add.graphics();
    lp.fillStyle(P.bgPanel, 0.97);
    lp.fillRoundedRect(width / 2 - lessonW / 2, lessonY - lessonH / 2, lessonW, lessonH, 6);
    lp.lineStyle(2, P.borderGold, 0.8);
    lp.strokeRoundedRect(width / 2 - lessonW / 2, lessonY - lessonH / 2, lessonW, lessonH, 6);
    // Inner top accent line
    lp.lineStyle(1, P.accentGlow, 0.3);
    lp.beginPath();
    lp.moveTo(width / 2 - lessonW / 2 + 16, lessonY - lessonH / 2 + 2);
    lp.lineTo(width / 2 + lessonW / 2 - 16, lessonY - lessonH / 2 + 2);
    lp.strokePath();

    // ── Lesson title ──────────────────────────────────────────────────────
    this.lessonTitleText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 22,
      '',
      {
        fontSize:        '28px',
        fontStyle:       'bold',
        color:           P.textTitle,
        stroke:          '#060814',
        strokeThickness: 6
      }
    );

    // ── Lesson body ───────────────────────────────────────────────────────
    this.lessonBodyText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 78,
      '',
      {
        fontSize:        '20px',
        color:           P.textMain,
        stroke:          '#060814',
        strokeThickness: 4,
        wordWrap:        { width: lessonW - 56 }
      }
    );

    if (gameState.getLearner() && this.getContentId()) {
      this.reportButton = this._makeActionButton(
        width / 2 + lessonW / 2 - 132,
        lessonY - lessonH / 2 + 18,
        104,
        30,
        'REPORT',
        () => this.openReportModal()
      );
    }

    // ── Page indicator ────────────────────────────────────────────────────
    this.pageIndicatorText = this.add.text(
      width / 1.34,
      lessonY - lessonH / 2 + 450,
      '',
      {
        fontSize:        '22px',
        fontStyle:       'bold',
        color:           P.textTitle,
        stroke:          '#060814',
        strokeThickness: 5
      }
    );

    // ── Navigation hint ───────────────────────────────────────────────────
    this.add.text(width / 2 - lessonW / 2 + 28, lessonY + lessonH / 2 - 28, '← → to navigate   ·   SPACE to close', {
      fontSize: '13px',
      color:    P.textDim,
      stroke:   '#060814',
      strokeThickness: 3
    });

    // ── NPC portrait area ─────────────────────────────────────────────────
    const portraitX = 100;
    const portraitY = height - 150;

    // Portrait frame
    const pf = this.add.graphics();
    pf.fillStyle(P.bgPortrait, 1);
    pf.fillRoundedRect(portraitX - 62, portraitY - 62, 124, 124, 6);
    pf.lineStyle(2, P.borderGold, 0.85);
    pf.strokeRoundedRect(portraitX - 62, portraitY - 62, 124, 124, 6);
    pf.lineStyle(1, P.accentGlow, 0.25);
    pf.strokeRoundedRect(portraitX - 58, portraitY - 58, 116, 116, 5);

    this.npcKey = this.npc?.name || '';
    this.npcDef = NPCRegistry[this.npcKey];
    this.createNPCIcon(portraitX, portraitY - this.npcDef.portraitOffsetY);

    // NPC name badge
    const nameBg = this.add.graphics();
    nameBg.fillStyle(P.btnNormal, 1);
    nameBg.lineStyle(1, P.borderGold, 0.7);
    nameBg.fillRoundedRect(portraitX - 54, portraitY + 64, 108, 24, 4);
    nameBg.strokeRoundedRect(portraitX - 54, portraitY + 64, 108, 24, 4);

    this.add.text(portraitX, portraitY + 76, this.npc.name, {
      fontSize:        '14px',
      fontStyle:       'bold',
      color:           P.textGold,
      stroke:          '#060814',
      strokeThickness: 4
    }).setOrigin(0.5);

    // ── Dialogue box ──────────────────────────────────────────────────────
    const dlgW = width - 300;
    const dlgX = width / 2 + 50;
    const dlgY = height - 150;

    const dlg = this.add.graphics();
    dlg.fillStyle(P.bgDialogue, 0.96);
    dlg.fillRoundedRect(dlgX - dlgW / 2, dlgY - 100, dlgW, 200, 6);
    dlg.lineStyle(2, P.borderGold, 0.75);
    dlg.strokeRoundedRect(dlgX - dlgW / 2, dlgY - 100, dlgW, 200, 6);
    dlg.lineStyle(1, P.accentGlow, 0.2);
    dlg.beginPath();
    dlg.moveTo(dlgX - dlgW / 2 + 12, dlgY - 98);
    dlg.lineTo(dlgX + dlgW / 2 - 12, dlgY - 98);
    dlg.strokePath();

    // ── Dialogue text ─────────────────────────────────────────────────────
    this.dialogueText = this.add.text(230, height - 230, '', {
      fontSize:        '19px',
      color:           P.textMain,
      stroke:          '#060814',
      strokeThickness: 4,
      wordWrap:        { width: width - 350 }
    });

    // ── SPACE hint ────────────────────────────────────────────────────────
    this.add.text(width - 330, height - 72, 'Press SPACE to close', {
      fontSize: '13px',
      color:    P.textDim,
      fontStyle:'italic',
      stroke:   '#060814',
      strokeThickness: 3
    });

    // ── Arrow buttons ─────────────────────────────────────────────────────
    this._makeDlgNavBtn(width / 2 - lessonW / 2 + lessonW - 100, lessonY + lessonH / 2 - 36, '◀', () => this.prevPage());
    this._makeDlgNavBtn(width / 2 - lessonW / 2 + lessonW - 54,  lessonY + lessonH / 2 - 36, '▶', () => this.nextPage());

    this.renderPage();

    this.handleRightKey = () => {
      if (this.isDomInputFocused()) return;
      this.nextPage();
    };

    this.handleLeftKey = () => {
      if (this.isDomInputFocused()) return;
      this.prevPage();
    };

    this.handleSpaceKey = (event) => {
      if (this.isDomInputFocused()) return;
      event.preventDefault();
      this.closeDialogue();
    };

    this.input.keyboard.on('keydown-RIGHT', this.handleRightKey);
    this.input.keyboard.on('keydown-LEFT', this.handleLeftKey);
    this.input.keyboard.on('keydown-SPACE', this.handleSpaceKey);
  }

  isDomInputFocused() {
    const active = document.activeElement;
    if (!active) return false;

    const tag = active.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      active.isContentEditable
    );
  }

  bindDomInputHotkeyShield(root) {
    if (!root) return;

    const stop = (event) => event.stopPropagation();

    root.querySelectorAll('input, textarea, select').forEach((el) => {
      el.addEventListener('keydown', stop);
      el.addEventListener('keyup', stop);
    });
  }

  suspendDomBlockingKeyCaptures() {
    if (!this.input?.keyboard) return;
    this.input.keyboard.removeCapture(['SPACE', 'LEFT', 'RIGHT', 'UP', 'DOWN']);
  }

  restoreDomBlockingKeyCaptures() {
    if (!this.input?.keyboard) return;
    this.input.keyboard.addCapture(['SPACE', 'LEFT', 'RIGHT', 'UP', 'DOWN']);
  }

  _makeDlgNavBtn(x, y, label, cb) {
    const w = 38, h = 28;
    const c  = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, border, 0.9);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    };

    draw(P.btnNormal, P.borderGold);
    c.add(bg);
    c.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '14px', fontStyle: 'bold',
      color: P.textMain, stroke: '#060814', strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover',  () => draw(P.btnHover, P.borderGlow));
    hit.on('pointerout',   () => draw(P.btnNormal, P.borderGold));
    hit.on('pointerdown',  () => draw(P.btnPress, P.borderDim));
    hit.on('pointerup',    () => { draw(P.btnHover, P.borderGlow); cb(); });
  }

  _makeActionButton(x, y, w, h, label, cb) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, border, 0.95);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    };

    draw(P.btnNormal, P.borderGold);
    c.add(bg);
    c.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '13px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(P.btnHover, P.borderGlow));
    hit.on('pointerout', () => draw(P.btnNormal, P.borderGold));
    hit.on('pointerdown', () => draw(P.btnPress, P.borderDim));
    hit.on('pointerup', () => {
      draw(P.btnHover, P.borderGlow);
      cb();
    });

    return c;
  }

  getContentId() {
    return this.npc?.contentId || this.npc?.content_id || null;
  }

  openReportModal() {
    if (this.reportModal) return;

    const contentId = this.getContentId();
    if (!contentId) {
      this.showSceneToast('This lesson cannot be reported.');
      return;
    }

    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(560px, calc(100vw - 32px))';
    modal.style.padding = '20px';
    modal.style.background = 'rgba(8, 14, 34, 0.98)';
    modal.style.border = '2px solid #c8870a';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.55)';
    modal.style.zIndex = '1000';

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
        <h2 style="margin:0; color:#f0ecff; font-size:22px;">Report Content</h2>
        <button type="button" id="close-flag-modal-btn" style="padding:8px 12px; background:#4a1111; color:#ffe9e9; border:1px solid #ab6666; border-radius:6px; cursor:pointer;">
          Close
        </button>
      </div>

      <div style="margin-bottom:10px; color:#c0a8e0; font-size:14px;">
        Select a reason and optionally add more detail.
      </div>

      <label for="flag-reason" style="display:block; margin-bottom:6px; color:#f4c048; font-size:13px;">Reason</label>
      <select id="flag-reason" style="width:100%; padding:10px; margin-bottom:12px; border-radius:6px; border:1px solid #2a5090; background:#0d1a30; color:#f0ecff;">
        <option value="">Select a reason</option>
        <option value="MISINFORMATION">Misinformation</option>
        <option value="OFFENSIVE_CONTENT">Offensive Content</option>
        <option value="HARASSMENT">Harassment</option>
        <option value="SPAM">Spam</option>
        <option value="COPYRIGHT">Copyright</option>
        <option value="OTHER">Other</option>
      </select>

      <label for="flag-details" style="display:block; margin-bottom:6px; color:#f4c048; font-size:13px;">Details</label>
      <textarea id="flag-details" rows="5" maxlength="1000" placeholder="Required if reason is Other" style="width:100%; padding:10px; margin-bottom:12px; border-radius:6px; border:1px solid #2a5090; background:#0d1a30; color:#f0ecff; resize:vertical;"></textarea>

      <div id="flag-status" style="min-height:18px; margin-bottom:12px; color:#ffd4a6;"></div>

      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button type="button" id="submit-flag-btn" style="padding:10px 14px; background:#1f3e76; color:#f5fbff; border:1px solid #6ea8ff; border-radius:6px; cursor:pointer; font-weight:bold;">
          Submit Report
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    this.reportModal = modal;
    this.input.keyboard.enabled = false;

    this.suspendDomBlockingKeyCaptures();
    this.bindDomInputHotkeyShield(modal);

    this.time.delayedCall(0, () => {
      const detailsField = modal.querySelector('#flag-details');
      detailsField?.focus();
    });

    const closeBtn = modal.querySelector('#close-flag-modal-btn');
    const submitBtn = modal.querySelector('#submit-flag-btn');
    const reasonEl = modal.querySelector('#flag-reason');
    const detailsEl = modal.querySelector('#flag-details');

    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyReportModal();
    });

    submitBtn?.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const reason = reasonEl?.value || '';
      const details = detailsEl?.value?.trim() || '';

      if (!reason) {
        this.setReportStatus('Please select a reason.', '#ffc7c7');
        return;
      }

      if (reason === 'OTHER' && !details) {
        this.setReportStatus('Details are required when reason is Other.', '#ffc7c7');
        return;
      }

      await this.submitContentFlag(contentId, reason, details);
    });
  }

  async submitContentFlag(contentId, reason, details) {
    try {
      this.setReportStatus('Submitting report...', '#ffd4a6');
      this.setReportFormEnabled(false);

      await apiService.flagContent(contentId, {
        reason,
        details: details || null
      });

      this.setReportStatus('Report submitted.', '#a7f0c2');
      this.showSceneToast('Content reported.');
      this.time.delayedCall(700, () => this.destroyReportModal());
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to submit report';
      this.setReportStatus(message, '#ffc7c7');
      this.setReportFormEnabled(true);
    }
  }

  setReportStatus(message, color = '#ffd4a6') {
    if (!this.reportModal) return;
    const statusEl = this.reportModal.querySelector('#flag-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = color;
  }

  setReportFormEnabled(enabled) {
    if (!this.reportModal) return;
    const fields = this.reportModal.querySelectorAll('select, textarea, button');
    fields.forEach((el) => {
      el.disabled = !enabled;
      el.style.opacity = enabled ? '1' : '0.65';
      if (el.tagName === 'BUTTON') {
        el.style.cursor = enabled ? 'pointer' : 'not-allowed';
      }
    });
  }

  destroyReportModal() {
    if (this.reportModal?.parentNode) {
      this.reportModal.parentNode.removeChild(this.reportModal);
    }
    this.reportModal = null;

    if (this.input?.keyboard) {
      this.input.keyboard.enabled = true;
    }

    this.restoreDomBlockingKeyCaptures();
  }

  showSceneToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, 44, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#3b1e17',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 10,
      duration: 1400,
      onComplete: () => text.destroy()
    });
  }

  // ── All methods below are logic-unchanged from original ───────────────────

  createNPCIcon(x, y) {
    const npcKey = this.npc?.name || '';
    if (npcKey && this.textures.exists(npcKey)) {
      this.add.sprite(x, y, npcKey, 0)
        .setDisplaySize(96, 96)
        .setDepth(10)
        .setScale(this.npcDef.scale);
    }
  }

  typeText(text) {
    if (this.typingTimer) { this.typingTimer.remove(); this.typingTimer = null; }
    let charIndex = 0;
    this.isTyping = true;
    this.typingTimer = this.time.addEvent({
      delay: 30,
      callback: () => {
        if (charIndex < text.length) {
          this.dialogueText.text += text[charIndex];
          charIndex++;
        } else {
          this.isTyping = false;
          this.typingTimer.remove();
          this.typingTimer = null;
        }
      },
      loop: true
    });
  }

  renderPage() {
    this.clearLessonMedia();
    const p = this.lessonPages[this.pageIndex];
    this.visitedPages.add(this.pageIndex);
    const dialogue = p.narration || '';
    this.fullCurrentText = dialogue;
    this.dialogueText.setText('');
    this.typeText(dialogue);
    this.lessonTitleText.setText(p.lessonTitle);
    this.lessonBodyText.setText(p.lessonBody);
    this.pageIndicatorText.setText(`${this.pageIndex + 1}/${this.lessonPages.length}`);
    const requestId = ++this.renderRequestId;

    if (p.mediaType === 'video' && p.videoUrl) {
      this.lessonBodyText.setVisible(false);
      void this.loadVideoForPage(p, requestId);
    } else {
      this.lessonBodyText.setVisible(true);
      this.lessonBodyText.setText(p.lessonBody || '');
    }
  }

  nextPage() {
    if (!this.lessonPages.length) return;
    if (this.isTyping) {
      this.typingTimer?.remove(); this.typingTimer = null;
      this.dialogueText.setText(this.fullCurrentText);
      this.isTyping = false;
      return;
    }
    this.pageIndex = (this.pageIndex + 1) % this.lessonPages.length;
    this.renderPage();
  }

  prevPage() {
    if (!this.lessonPages.length) return;
    if (this.isTyping) {
      this.typingTimer?.remove(); this.typingTimer = null;
      this.dialogueText.setText(this.fullCurrentText);
      this.isTyping = false;
      return;
    }
    this.pageIndex = (this.pageIndex - 1 + this.lessonPages.length) % this.lessonPages.length;
    this.renderPage();
  }

  closeDialogue() {
    const viewedAllPages = this.lessonPages.length === 0 || this.visitedPages.size >= this.lessonPages.length;
    const contentId = this.npc?.contentId || this.npc?.content_id;
    const payload = {
      contentId,
      topicId: this.npc?.topicId || this.npc?.topic_id || null,
      npcId: this.npc?.npcId || this.npc?.npc_id || null
    };

    if (viewedAllPages && contentId) {
      gameState.markLessonComplete(contentId, payload);
      dailyQuestService.recordEvent('lesson_completed');
      void apiService.completeLessonProgress(payload)
        .then((saved) => gameState.upsertLessonProgress(saved))
        .catch((e) => console.warn('Completion sync failed:', e));
    }
    this.destroyReportModal();
    this.clearLessonMedia();
    this.scene.stop();
    this.scene.resume('GameMapScene');
  }

  formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const m = Math.floor((seconds / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(seconds / 3600);
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  clearLessonMedia() {
    if (this.videoTicker) { this.videoTicker.remove(); this.videoTicker = null; }
    this.videoUi.forEach((n) => n.destroy());
    this.videoUi = [];
    this.videoTimeText = null;
    if (this.lessonVideo) { this.lessonVideo.stop(); this.lessonVideo.destroy(); this.lessonVideo = null; }
  }

  createVideoControls() {
    const el = this.lessonVideo?.video;
    if (!el) return;

    let isMuted = this.lessonVideo.mute ?? false;
    let volume = Number.isFinite(el.volume) ? el.volume : 0.35;
    volume = Phaser.Math.Clamp(volume, 0, 1);

    const controlsY = this.lessonPanelBox.y + this.lessonPanelBox.h / 2 - 35;
    const centerX   = this.lessonPanelBox.x;
    const trackW    = 520;

    const volumeTrackW = 120;
    const volumeTrackX = centerX - (trackW / 2) - 110;
    const volumeTrackY = controlsY;

    const muteBtnX  = centerX + (trackW / 2) + 72;
    const muteBtnY  = controlsY;

    const muteBtnBg = this.add.rectangle(muteBtnX, muteBtnY, 80, 32, 0x0d1530, 0.85)
      .setStrokeStyle(1, P.borderGold)
      .setInteractive({ useHandCursor: true });

    const muteBtnText = this.add.text(muteBtnX, muteBtnY, 'Mute', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5);

    const refreshMuteLabel = () => {
      muteBtnText.setText(isMuted || volume === 0 ? 'Unmute' : 'Mute');
    };

    const applyVolume = () => {
      el.volume = volume;
      this.lessonVideo.setMute(isMuted || volume === 0);
      refreshMuteLabel();
    };

    const volumeLabel = this.add.text(volumeTrackX, volumeTrackY - 18, `Vol ${Math.round(volume * 100)}%`, {
      fontSize: '12px',
      color: P.textTitle,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5);

    const volumeTrackBg = this.add.rectangle(volumeTrackX, volumeTrackY, volumeTrackW, 6, 0x0a1020, 1)
      .setOrigin(0.5)
      .setStrokeStyle(1, P.borderGold, 0.4)
      .setInteractive({ useHandCursor: true });

    const volumeTrackFill = this.add.rectangle(
      volumeTrackX - volumeTrackW / 2,
      volumeTrackY,
      volume * volumeTrackW,
      6,
      0x4193d5,
      1
    ).setOrigin(0, 0.5);

    const volumeKnob = this.add.circle(
      volumeTrackX - volumeTrackW / 2 + volume * volumeTrackW,
      volumeTrackY,
      8,
      P.borderGlow
    ).setInteractive({ draggable: true, useHandCursor: true });

    const syncVolumeUi = () => {
      const knobX = volumeTrackX - volumeTrackW / 2 + volume * volumeTrackW;
      volumeKnob.x = knobX;
      volumeTrackFill.width = volume * volumeTrackW;
      volumeLabel.setText(`Vol ${Math.round(volume * 100)}%`);
    };

    const setVolumeFromX = (x) => {
      const left = volumeTrackX - volumeTrackW / 2;
      const right = volumeTrackX + volumeTrackW / 2;
      const clampedX = Phaser.Math.Clamp(x, left, right);

      volume = (clampedX - left) / volumeTrackW;

      if (volume > 0 && isMuted) {
        isMuted = false;
      }

      applyVolume();
      syncVolumeUi();
    };

    volumeTrackBg.on('pointerdown', (pointer) => setVolumeFromX(pointer.x));
    volumeKnob.on('drag', (_pointer, dragX) => setVolumeFromX(dragX));

    muteBtnBg.on('pointerdown', () => {
      if (isMuted || volume === 0) {
        isMuted = false;
        if (volume === 0) volume = 0.35;
      } else {
        isMuted = true;
      }

      applyVolume();
      syncVolumeUi();
    });

    muteBtnBg.on('pointerover', () => muteBtnBg.setFillStyle(0x2a1060, 0.9));
    muteBtnBg.on('pointerout',  () => muteBtnBg.setFillStyle(0x0d1530, 0.85));
    this.videoUi.push(
      muteBtnBg,
      muteBtnText,
      volumeLabel,
      volumeTrackBg,
      volumeTrackFill,
      volumeKnob
    );

    [muteBtnBg, muteBtnText, volumeLabel, volumeTrackBg, volumeTrackFill].forEach((n) => n.setDepth(40));
    volumeKnob.setDepth(42);
    
    this.lessonVideo.setInteractive({ useHandCursor: true });
    this.lessonVideo.on('pointerdown', () => {
      const el = this.lessonVideo?.video;
      if (!el) return;
      if (el.ended) { this.lessonVideo.setCurrentTime(0); this.lessonVideo.setPaused(false); return; }
      if (el.paused) this.lessonVideo.setPaused(false);
      else this.lessonVideo.setPaused(true);
    });
    const trackBg   = this.add.rectangle(centerX, controlsY, trackW, 8, 0x0a1020, 1).setOrigin(0.5);
    trackBg.setStrokeStyle(1, P.borderGold, 0.4);
    const trackFill = this.add.rectangle(centerX - trackW / 2, controlsY, 0, 8, P.accentBlue ?? 0x4193d5, 1).setOrigin(0, 0.5);
    const knob      = this.add.circle(centerX - trackW / 2, controlsY, 9, P.borderGlow).setInteractive({ draggable: true, useHandCursor: true });

    this.videoTimeText = this.add.text(centerX, controlsY + 18, '00:00 / 00:00', {
      fontSize: '14px', color: P.textTitle, stroke: '#060814', strokeThickness: 3
    }).setOrigin(0.5, 0);

    this.videoUi.push(trackBg, trackFill, knob, this.videoTimeText);

    const setFromX = (x) => {
      const left = centerX - trackW / 2, right = centerX + trackW / 2;
      const clampedX = Phaser.Math.Clamp(x, left, right);
      const t = (clampedX - left) / trackW;
      knob.x = clampedX;
      trackFill.width = t * trackW;
      if (Number.isFinite(el.duration) && el.duration > 0) el.currentTime = t * el.duration;
    };

    knob.on('drag', (pointer, dragX) => setFromX(dragX));
    trackBg.setInteractive();
    trackBg.on('pointerdown', (pointer) => setFromX(pointer.x));

    [muteBtnBg, muteBtnText].forEach((n) => n.setDepth(40));
    [trackBg, trackFill].forEach((n) => n.setDepth(40));
    knob.setDepth(42);
    this.videoTimeText.setDepth(41);
    muteBtnText.setDepth(41);

    applyVolume();
    syncVolumeUi();

    this.videoTicker = this.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        const current  = Number.isFinite(el.currentTime) ? el.currentTime : 0;
        const duration = Number.isFinite(el.duration)    ? el.duration    : 0;
        if (duration > 0) {
          const t = current / duration;
          knob.x = centerX - trackW / 2 + t * trackW;
          trackFill.width = t * trackW;
        }
        this.videoTimeText.setText(`${this.formatTime(current)} / ${this.formatTime(duration)}`);
      }
    });
  }

  primeVideoFrame() {
    const videoObj = this.lessonVideo;
    if (!videoObj) return;

    const revealFirstFrame = () => {
      if (this.lessonVideo !== videoObj) return;
      videoObj.setCurrentTime(0);
      videoObj.setPaused(true);
      videoObj.setMute(false);
      videoObj.setVisible(true);
    };

    // Wait until Phaser has created the internal texture for this video
    videoObj.once('created', () => {
      if (this.lessonVideo !== videoObj) return;
      this.fitLessonVideoToPanel();
      videoObj.play(false);
      this.time.delayedCall(0, revealFirstFrame);
    });

    // Kick playback so the first frame can be captured
    videoObj.play(false);
  }

  async loadVideoForPage(page, requestId) {
    try {
      const cacheKey = await this.ensureVideoLoaded(
        page.videoUrl,
        `lesson-video-${this.npc?.contentId || this.pageIndex}`
      );

      if (requestId !== this.renderRequestId) return;

      this.lessonVideo = this.add.video(
        this.lessonPanelBox.x,
        this.lessonPanelBox.y,
        cacheKey
      );

      this.lessonVideo.setDepth(20);
      this.lessonVideo.setVisible(false);
      this.lessonVideo.setLoop(false);
      this.lessonVideo.setMute(true);
      this.fitLessonVideoToPanel();
      this.primeVideoFrame();
      this.createVideoControls();
    } catch (_e) {
      if (requestId !== this.renderRequestId) return;
      this.lessonBodyText.setVisible(true);
      this.lessonBodyText.setText('Video failed to load.');
    }
  }

  async ensureVideoLoaded(videoUrl, cacheKey) {
    if (this.cache.video.exists(cacheKey)) return cacheKey;

    return new Promise((resolve, reject) => {
      this.load.setCORS('anonymous');
      this.load.video(cacheKey, videoUrl, 'loadeddata', false, true);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve(cacheKey));
      this.load.once(Phaser.Loader.Events.LOAD_ERROR, () => reject(new Error('Video load failed')));
      this.load.start();
    });
  }

  fitLessonVideoToPanel() {
    if (!this.lessonVideo?.video || !this.lessonPanelBox) return;

    const maxWidth = this.lessonPanelBox.w - 80;
    const maxHeight = this.lessonPanelBox.h - 140;
    const sourceWidth = this.lessonVideo.video.videoWidth || 16;
    const sourceHeight = this.lessonVideo.video.videoHeight || 9;

    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);

    this.lessonVideo.setDisplaySize(
      Math.floor(sourceWidth * scale),
      Math.floor(sourceHeight * scale)
    );
  }

}



