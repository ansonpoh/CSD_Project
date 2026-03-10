export const sharedAdminMethods = {
  destroyAllModals() {
    this.destroyFlagQueueModal();
    this.destroyReviewQueueModal();
    this.destroyContributorAccountsModal();
    this.destroyTelemetryModal();
    this.destroyContributorDetailsModal();
  },

  getErrorMessage(error, fallback) {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
    );
  },

  createActionCard(x, y, w, h, title, subtitle, onClick) {
    const container = this.add.container(x - w / 2, y - h / 2);
    const background = this.add.graphics();

    const draw = (fill, border) => {
      background.clear();
      background.fillStyle(fill, 1);
      background.fillRoundedRect(0, 0, w, h, 6);
      background.lineStyle(2, border, 1);
      background.strokeRoundedRect(0, 0, w, h, 6);
      background.fillStyle(0xffffff, 0.05);
      background.fillRoundedRect(2, 2, w - 4, h * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(0x4a2218, 0xd49a83);
    container.add(background);
    container.add(this.add.text(w / 2, 42, title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff0e8',
      stroke: '#240d09',
      strokeThickness: 4
    }).setOrigin(0.5));
    container.add(this.add.text(w / 2, 92, subtitle, {
      fontSize: '14px',
      color: '#f3c7b3',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5));

    const hitArea = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);
    hitArea.on('pointerover', () => draw(0x643125, 0xf0bea8));
    hitArea.on('pointerout', () => draw(0x4a2218, 0xd49a83));
    hitArea.on('pointerdown', () => draw(0x32140f, 0xbd7e61));
    hitArea.on('pointerup', async () => {
      draw(0x643125, 0xf0bea8);
      try {
        await onClick();
      } catch (error) {
        this.showToast(error?.message || 'Action failed');
      }
    });
  },

  createButton(x, y, w, h, label, onClick, normal, hover) {
    const container = this.add.container(x, y);
    const background = this.add.graphics();

    const draw = (fill, border) => {
      background.clear();
      background.fillStyle(fill, 1);
      background.fillRoundedRect(0, 0, w, h, 5);
      background.lineStyle(2, border, 1);
      background.strokeRoundedRect(0, 0, w, h, 5);
    };

    draw(normal, 0xc8870a);
    container.add(background);
    container.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fff3ed',
      stroke: '#210e0a',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hitArea = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);
    hitArea.on('pointerover', () => draw(hover, 0xf0b030));
    hitArea.on('pointerout', () => draw(normal, 0xc8870a));
    hitArea.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
    hitArea.on('pointerup', onClick);
  },

  updateSceneInputInteractivity() {
    this.input.enabled =
      !this.reviewQueueModal &&
      !this.flagQueueModal &&
      !this.contributorAccountsModal &&
      !this.telemetryModal &&
      !this.contributorDetailsModal;
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  escapeCssSelector(value) {
    return String(value).replace(/["\\]/g, '\\$&');
  },

  previewText(value, maxLength) {
    if (!value) return '';
    const normalized = String(value).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
  },

  formatDate(value) {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  },

  showToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#3b1e17',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 10,
      duration: 1400,
      onComplete: () => text.destroy()
    });
  }
};
