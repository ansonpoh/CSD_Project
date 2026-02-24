import Phaser from 'phaser';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';

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
  }

  init(data) {
    this.npc = data.npc;
    this.dialogueIndex = 0;
    this.pageIndex = 0;
    this.lessonPages = data.lessonPages;
  }

  create() {
    this.events.once('shutdown', () => this.clearLessonMedia());
    this.events.once('destroy', () => this.clearLessonMedia());
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent overlay
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    const narrationH = 200;
    const narrationY = height - 150;
    const narrationTop = narrationY - narrationH / 2;

    const lessonH = Math.min(520, height * 0.5);
    const lessonY = (narrationTop -50) - lessonH / 2;
    const lessonW = Math.min(1100, width - 240);
  
    this.lessonPanelBox = {
      x: width / 2,
      y: lessonY,
      w: lessonW,
      h: lessonH
    };

    // Center lesson panel
    const lessonPanel = this.add.rectangle(
      width / 2,
      lessonY,
      lessonW,
      lessonH,
      0x10182b,
      0.98
    );
    lessonPanel.setStrokeStyle(3, 0x4a90e2);

    // Lesson title
    this.lessonTitleText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 22,
      '',
      {
        fontSize: '30px',
        color: '#9fd0ff',
        fontStyle: 'bold'
      }
    );

    // Lesson body
    this.lessonBodyText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 80,
      '',
      {
        fontSize: '22px',
        color: '#ffffff',
        wordWrap: { width: lessonW - 56 }
      }
    );

    // Page Indicator
    this.pageIndicatorText = this.add.text (
      width / 1.34 ,
      lessonY - lessonH / 2 + 470,
      '',
      {
        fontSize: '30px',
        color: '#9fd0ff',
        fontStyle: 'bold'
      }
    )

    // NPC portrait area
    const portraitX = 100;
    const portraitY = height - 150;
    
    this.add.rectangle(portraitX, portraitY, 120, 120, 0x16213e, 1)
      .setStrokeStyle(3, 0x4a90e2);
    
    // NPC icon - replaced emoji with graphics
    this.npcKey = this.npc?.name || '';
    this.npcDef = NPCRegistry[this.npcKey]
    this.createNPCIcon(portraitX, portraitY - this.npcDef.portraitOffsetY);

    // NPC name
    this.add.text(portraitX, portraitY + 80, this.npc.name, {
      fontSize: '18px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Dialogue box
    const dialogueBox = this.add.rectangle(
      width / 2 + 50,
      height - 150,
      width - 300,
      200,
      0x16213e,
      0.95
    );
    dialogueBox.setStrokeStyle(3, 0x4a90e2);

    // Dialogue text
    this.dialogueText = this.add.text(
      230,
      height - 230,
      '',
      {
        fontSize: '20px',
        color: '#ffffff',
        wordWrap: { width: width - 350 }
      }
    );

    // Continue indicator
    const continueText = this.add.text(
      width - 330,
      height - 70,
      'Press space to continue',
      {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'italic'
      }
    );
    // Show first dialogue
    this.renderPage();

    // Add keyboard support
    this.input.keyboard.on('keydown-RIGHT', () => this.nextPage());
    this.input.keyboard.on('keydown-LEFT', () => this.prevPage());
    this.input.keyboard.on('keydown-SPACE', () => this.closeDialogue());
  }

  createNPCIcon(x, y) {
    // Create a wizard/NPC icon using graphics

    const npcKey = this.npc?.name || '';

    if (npcKey && this.textures.exists(npcKey)) {
      this.add.sprite(x, y, npcKey, 0)
        .setDisplaySize(96, 96)
        .setDepth(10)
        .setScale(this.npcDef.scale);
      return;
    }
  }

  typeText(text) {
    if (this.typingTimer) {
      this.typingTimer.remove();
      this.typingTimer = null;
    }

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
        this.lessonVideo = this.add.video(
          this.lessonPanelBox.x,
          this.lessonPanelBox.y,
          p.videoKey
        );
        this.lessonVideo.setDisplaySize(190, 190);
        this.lessonVideo.setDepth(20);
        this.lessonVideo.setVisible(true);
        this.lessonVideo.setLoop(false);
        this.lessonVideo.setMute(true); 
        this.lessonVideo.play(false);

        this.time.delayedCall(50, () => {
          if (!this.lessonVideo) return;
          this.lessonVideo.setCurrentTime(0);
          this.lessonVideo.setPaused(true);
          this.lessonVideo.setMute(false);
        });

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
    if(!this.lessonPages.length) return;

    if (this.isTyping) {
      this.typingTimer?.remove();
      this.typingTimer = null;
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
      this.typingTimer?.remove();
      this.typingTimer = null;
      this.dialogueText.setText(this.fullCurrentText);
      this.isTyping = false;
      return;
    }

    this.pageIndex = (this.pageIndex - 1 + this.lessonPages.length) % this.lessonPages.length;
    this.renderPage();
  }

  closeDialogue() {
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
    if (this.videoTicker) {
      this.videoTicker.remove();
      this.videoTicker = null;
    }

    this.videoUi.forEach(n => n.destroy());
    this.videoUi = [];
    this.videoTimeText = null;

    if (this.lessonVideo) {
      this.lessonVideo.stop();
      this.lessonVideo.destroy();
      this.lessonVideo = null;
    }
  }

  createVideoControls() {
    const el = this.lessonVideo?.video;
    if (!el) return;


    // Mute 
    let isMuted = this.lessonVideo.mute ?? false;
    // Mute toggle button (top-right of video panel)
    const videoTop = this.lessonPanelBox.y - (this.lessonPanelBox.h / 2) + 20;
    const videoRight = this.lessonPanelBox.x + (this.lessonPanelBox.w / 2) - 30;

    const muteBtnBg = this.add.rectangle(videoRight - 40, videoTop + 20, 80, 32, 0x000000, 0.6)
      .setStrokeStyle(2, 0x9fd0ff)
      .setInteractive({ useHandCursor: true });

    const muteBtnText = this.add.text(
      videoRight - 40,
      videoTop + 20,
      isMuted ? 'Unmute' : 'Mute',
      { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);

    const refreshMuteLabel = () => {
      muteBtnText.setText(isMuted ? 'Unmute' : 'Mute');
    };

    muteBtnBg.on('pointerdown', () => {
      isMuted = !isMuted;
      this.lessonVideo.setMute(isMuted);
      refreshMuteLabel();
    });

    // optional hover
    muteBtnBg.on('pointerover', () => muteBtnBg.setFillStyle(0x1e293b, 0.8));
    muteBtnBg.on('pointerout', () => muteBtnBg.setFillStyle(0x000000, 0.6));

    this.videoUi.push(muteBtnBg, muteBtnText);

    // Click video to toggle pause/play
    this.lessonVideo.setInteractive({ useHandCursor: true });
    this.lessonVideo.on('pointerdown', () => {
      const el = this.lessonVideo?.video;
      if (!el) return;

      if (el.ended) {
        this.lessonVideo.setCurrentTime(0);
        this.lessonVideo.setPaused(false);
        return;
      }

      if (el.paused) this.lessonVideo.setPaused(false);
      else this.lessonVideo.setPaused(true);
    });

    const controlsY = this.lessonPanelBox.y + this.lessonPanelBox.h / 2 - 35;
    const centerX = this.lessonPanelBox.x;
    const trackW = 520;

    // Track
    const trackBg = this.add.rectangle(centerX, controlsY, trackW, 8, 0xffffff, 0.35).setOrigin(0.5);
    const trackFill = this.add.rectangle(centerX - trackW / 2, controlsY, 0, 8, 0x3b82f6, 1).setOrigin(0, 0.5);

    // Knob
    const knob = this.add.circle(centerX - trackW / 2, controlsY, 9, 0x3b82f6).setInteractive({ draggable: true, useHandCursor: true });

    this.videoTimeText = this.add.text(centerX, controlsY + 18, '00:00 / 00:00', {
      fontSize: '16px',
      color: '#9fd0ff'
    }).setOrigin(0.5, 0);

    this.videoUi.push(trackBg, trackFill, knob, this.videoTimeText);

    const setFromX = (x) => {
      const left = centerX - trackW / 2;
      const right = centerX + trackW / 2;
      const clampedX = Phaser.Math.Clamp(x, left, right);
      const t = (clampedX - left) / trackW;
      knob.x = clampedX;
      trackFill.width = t * trackW;

      if (Number.isFinite(el.duration) && el.duration > 0) {
        el.currentTime = t * el.duration;
      }
    };

    knob.on('drag', (pointer, dragX) => setFromX(dragX));

    // click on track to seek
    trackBg.setInteractive();
    trackBg.on('pointerdown', (pointer) => setFromX(pointer.x));
    
    muteBtnBg.setDepth(40);
    muteBtnText.setDepth(40 + 1);

    trackBg.setDepth(40);
    trackFill.setDepth(40 + 1);
    knob.setDepth(40 + 2);
    this.videoTimeText.setDepth(40 + 1);

    this.videoTicker = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const current = Number.isFinite(el.currentTime) ? el.currentTime : 0;
        const duration = Number.isFinite(el.duration) ? el.duration : 0;

        if (duration > 0) {
          const t = current / duration;
          const left = centerX - trackW / 2;
          knob.x = left + t * trackW;
          trackFill.width = t * trackW;
        }

        this.videoTimeText.setText(`${this.formatTime(current)} / ${this.formatTime(duration)}`);
      }
    });
  }
}