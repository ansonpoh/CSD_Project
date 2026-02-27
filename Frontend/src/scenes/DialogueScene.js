import Phaser from 'phaser';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';
import { apiService } from '../services/api';
import { gameState } from '../services/gameState';

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
    this.events.once('shutdown', () => this.clearLessonMedia());
    this.events.once('destroy',  () => this.clearLessonMedia());

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

    // ── Page indicator ────────────────────────────────────────────────────
    this.pageIndicatorText = this.add.text(
      width / 1.34,
      lessonY - lessonH / 2 + 470,
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

    this.input.keyboard.on('keydown-RIGHT', () => this.nextPage());
    this.input.keyboard.on('keydown-LEFT',  () => this.prevPage());
    this.input.keyboard.on('keydown-SPACE', () => this.closeDialogue());
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

    if (p.mediaType === 'video' && p.videoKey) {
      this.lessonBodyText.setVisible(false);
      if (this.cache.video.exists(p.videoKey)) {
        this.lessonVideo = this.add.video(this.lessonPanelBox.x, this.lessonPanelBox.y, p.videoKey);
        this.lessonVideo.setDisplaySize(190, 190);
        this.lessonVideo.setDepth(20);
        this.lessonVideo.setVisible(false);
        this.lessonVideo.setLoop(false);
        this.lessonVideo.setMute(true);
        this.primeVideoFrame();
        this.createVideoControls();
      } else {
        this.lessonBodyText.setVisible(true);
        this.lessonBodyText.setText('Video not found.');
      }
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
      void apiService.completeLessonProgress(payload)
        .then((saved) => gameState.upsertLessonProgress(saved))
        .catch((e) => console.warn('Completion sync failed:', e));
    }
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
    const videoTop   = this.lessonPanelBox.y - (this.lessonPanelBox.h / 2) + 20;
    const videoRight = this.lessonPanelBox.x + (this.lessonPanelBox.w / 2) - 30;

    const muteBtnBg = this.add.rectangle(videoRight - 40, videoTop + 20, 80, 32, 0x0d1530, 0.85)
      .setStrokeStyle(1, P.borderGold)
      .setInteractive({ useHandCursor: true });

    const muteBtnText = this.add.text(videoRight - 40, videoTop + 20, isMuted ? 'Unmute' : 'Mute', {
      fontSize: '13px', fontStyle: 'bold',
      color: P.textMain, stroke: '#060814', strokeThickness: 3
    }).setOrigin(0.5);

    const refreshMuteLabel = () => muteBtnText.setText(isMuted ? 'Unmute' : 'Mute');
    muteBtnBg.on('pointerdown', () => { isMuted = !isMuted; this.lessonVideo.setMute(isMuted); refreshMuteLabel(); });
    muteBtnBg.on('pointerover', () => muteBtnBg.setFillStyle(0x2a1060, 0.9));
    muteBtnBg.on('pointerout',  () => muteBtnBg.setFillStyle(0x0d1530, 0.85));
    this.videoUi.push(muteBtnBg, muteBtnText);

    this.lessonVideo.setInteractive({ useHandCursor: true });
    this.lessonVideo.on('pointerdown', () => {
      const el = this.lessonVideo?.video;
      if (!el) return;
      if (el.ended) { this.lessonVideo.setCurrentTime(0); this.lessonVideo.setPaused(false); return; }
      if (el.paused) this.lessonVideo.setPaused(false);
      else this.lessonVideo.setPaused(true);
    });

    const controlsY = this.lessonPanelBox.y + this.lessonPanelBox.h / 2 - 35;
    const centerX   = this.lessonPanelBox.x;
    const trackW    = 520;

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
      videoObj.play(false);
      this.time.delayedCall(0, revealFirstFrame);
    });

    // Kick playback so the first frame can be captured
    videoObj.play(false);
  }
}