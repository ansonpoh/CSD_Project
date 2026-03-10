import Phaser from 'phaser';

export const dialogueSceneVideoLoadingMethods = {
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

    videoObj.once('created', () => {
      if (this.lessonVideo !== videoObj) return;
      this.fitLessonVideoToPanel();
      videoObj.play(false);
      this.time.delayedCall(0, revealFirstFrame);
    });

    videoObj.play(false);
  },

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
  },

  async ensureVideoLoaded(videoUrl, cacheKey) {
    if (this.cache.video.exists(cacheKey)) return cacheKey;

    return new Promise((resolve, reject) => {
      this.load.setCORS('anonymous');
      this.load.video(cacheKey, videoUrl, 'loadeddata', false, true);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve(cacheKey));
      this.load.once(Phaser.Loader.Events.LOAD_ERROR, () => reject(new Error('Video load failed')));
      this.load.start();
    });
  },

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
};
