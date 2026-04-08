export const dialogueScenePaginationMethods = {
  buildSyncedLessonTitle(pageTitle = '') {
    const totalPages = this.lessonPages.length || 0;
    const currentPage = totalPages > 0 ? this.pageIndex + 1 : 0;
    const normalizedTitle = String(pageTitle || '').trim();

    // Remove any stale embedded page counter from content titles (e.g. "(2/10)").
    const titleWithoutCounter = normalizedTitle.replace(/\s*\(\s*\d+\s*\/\s*\d+\s*\)\s*$/u, '').trim();
    const baseTitle = titleWithoutCounter || 'Lesson';
    return `${baseTitle} (${currentPage}/${totalPages})`;
  },

  typeText(text) {
    if (!this.dialogueText) return;

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
          return;
        }

        this.isTyping = false;
        this.typingTimer.remove();
        this.typingTimer = null;
      },
      loop: true
    });
  },

  renderPage() {
    this.clearLessonMedia();
    const page = this.lessonPages[this.pageIndex];
    this.visitedPages.add(this.pageIndex);
    this.refreshRatingSummary?.();

    const dialogue = page.narration || '';
    this.fullCurrentText = dialogue;
    this.dialogueText?.setText('');
    this.typeText(dialogue);
    this.lessonTitleText.setText(this.buildSyncedLessonTitle(page.lessonTitle));
    this.lessonBodyText.setText(page.lessonBody);
    this.pageIndicatorText.setText(`${this.pageIndex + 1}/${this.lessonPages.length}`);

    const requestId = ++this.renderRequestId;
    if (page.mediaType === 'video' && page.videoUrl) {
      this.lessonBodyText.setVisible(false);
      void this.loadVideoForPage(page, requestId);
      return;
    }

    this.lessonBodyText.setVisible(true);
    this.lessonBodyText.setText(page.lessonBody || '');
  },

  nextPage() {
    if (!this.lessonPages.length) return;
    if (this.isTyping) {
      this.typingTimer?.remove();
      this.typingTimer = null;
      this.dialogueText?.setText(this.fullCurrentText);
      this.isTyping = false;
      return;
    }

    this.pageIndex = (this.pageIndex + 1) % this.lessonPages.length;
    this.renderPage();
  },

  prevPage() {
    if (!this.lessonPages.length) return;
    if (this.isTyping) {
      this.typingTimer?.remove();
      this.typingTimer = null;
      this.dialogueText?.setText(this.fullCurrentText);
      this.isTyping = false;
      return;
    }

    this.pageIndex = (this.pageIndex - 1 + this.lessonPages.length) % this.lessonPages.length;
    this.renderPage();
  },

  formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const m = Math.floor((seconds / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(seconds / 3600);
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  },

  clearLessonMedia() {
    if (this.videoTicker) {
      this.videoTicker.remove();
      this.videoTicker = null;
    }

    this.videoUi.forEach((node) => node.destroy());
    this.videoUi = [];
    this.videoTimeText = null;

    if (this.lessonVideo) {
      this.lessonVideo.stop();
      this.lessonVideo.destroy();
      this.lessonVideo = null;
    }
  }
};
