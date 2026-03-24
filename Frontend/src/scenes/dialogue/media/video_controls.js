import Phaser from 'phaser';
import { P } from '../constants.js';

export const dialogueSceneVideoControlMethods = {
  createVideoControls() {
    const el = this.lessonVideo?.video;
    if (!el) return;

    let isMuted = this.lessonVideo.mute ?? false;
    let volume = Number.isFinite(el.volume) ? el.volume : 0.35;
    volume = Phaser.Math.Clamp(volume, 0, 1);

    const controlsY = this.lessonPanelBox.y + this.lessonPanelBox.h / 2 - 35;
    const centerX = this.lessonPanelBox.x;
    const trackW = 520;
    const volumeTrackW = 120;
    const volumeTrackX = centerX - (trackW / 2) - 110;
    const volumeTrackY = controlsY;
    const muteBtnX = centerX + (trackW / 2) + 72;
    const muteBtnY = controlsY;

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

    const refreshMuteLabel = () => {
      muteBtnText.setText(isMuted || volume === 0 ? 'Unmute' : 'Mute');
    };

    const syncVolumeUi = () => {
      const knobX = volumeTrackX - volumeTrackW / 2 + volume * volumeTrackW;
      volumeKnob.x = knobX;
      volumeTrackFill.width = volume * volumeTrackW;
      volumeLabel.setText(`Vol ${Math.round(volume * 100)}%`);
    };

    const applyVolume = () => {
      el.volume = volume;
      this.lessonVideo.setMute(isMuted || volume === 0);
      refreshMuteLabel();
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
    muteBtnBg.on('pointerout', () => muteBtnBg.setFillStyle(0x0d1530, 0.85));

    this.videoUi.push(muteBtnBg, muteBtnText, volumeLabel, volumeTrackBg, volumeTrackFill, volumeKnob);
    [muteBtnBg, muteBtnText, volumeLabel, volumeTrackBg, volumeTrackFill].forEach((node) => node.setDepth(40));
    volumeKnob.setDepth(42);

    this.createVideoSeekControls(el, centerX, controlsY, trackW, muteBtnText);
    this.bindVideoTapToggle();

    applyVolume();
    syncVolumeUi();
  },

  createVideoSeekControls(el, centerX, controlsY, trackW, muteBtnText) {
    const trackBg = this.add.rectangle(centerX, controlsY, trackW, 8, 0x0a1020, 1).setOrigin(0.5);
    trackBg.setStrokeStyle(1, P.borderGold, 0.4);

    const trackFill = this.add.rectangle(centerX - trackW / 2, controlsY, 0, 8, 0x4193d5, 1).setOrigin(0, 0.5);
    const knob = this.add.circle(centerX - trackW / 2, controlsY, 9, P.borderGlow)
      .setInteractive({ draggable: true, useHandCursor: true });

    this.videoTimeText = this.add.text(centerX, controlsY + 18, '00:00 / 00:00', {
      fontSize: '14px',
      color: P.textTitle,
      stroke: '#060814',
      strokeThickness: 3
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

    knob.on('drag', (_pointer, dragX) => setFromX(dragX));
    trackBg.setInteractive();
    trackBg.on('pointerdown', (pointer) => setFromX(pointer.x));

    [trackBg, trackFill].forEach((node) => node.setDepth(40));
    knob.setDepth(42);
    this.videoTimeText.setDepth(41);
    muteBtnText.setDepth(41);

    this.videoTicker = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const current = Number.isFinite(el.currentTime) ? el.currentTime : 0;
        const duration = Number.isFinite(el.duration) ? el.duration : 0;
        if (duration > 0) {
          const t = current / duration;
          knob.x = centerX - trackW / 2 + t * trackW;
          trackFill.width = t * trackW;
        }
        this.videoTimeText.setText(`${this.formatTime(current)} / ${this.formatTime(duration)}`);
      }
    });
  },

  bindVideoTapToggle() {
    this.lessonVideo.setInteractive({ useHandCursor: true });
    this.lessonVideo.on('pointerdown', () => {
      const video = this.lessonVideo?.video;
      if (!video) return;

      if (video.ended) {
        this.lessonVideo.setCurrentTime(0);
        this.lessonVideo.setPaused(false);
        return;
      }

      this.lessonVideo.setPaused(!video.paused);
    });
  }
};
