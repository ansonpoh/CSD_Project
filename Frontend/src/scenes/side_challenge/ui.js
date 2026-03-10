import { SIDE_CHALLENGE_COLORS as C } from './constants.js';

export const sideChallengeUiMethods = {
  drawPanelFrame(left, top, width, height) {
    const panel = this.add.graphics();
    panel.fillStyle(C.panel, 0.98);
    panel.fillRoundedRect(left, top, width, height, 10);
    panel.lineStyle(2, C.gold, 0.9);
    panel.strokeRoundedRect(left, top, width, height, 10);
  },

  renderChallengeHeader(centerX, top) {
    this.add.text(centerX, top + 34, this.challenge.title, {
      fontSize: '30px',
      fontStyle: 'bold',
      color: C.text,
      stroke: '#06101a',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(centerX, top + 74, `${this.challenge.prompt}  Drag each word into the correct slot.`, {
      fontSize: '18px',
      color: C.sub,
      stroke: '#06101a',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(centerX, top + 108, `Reward: +${this.challenge.rewardXp} XP${this.challenge.rewardAssist ? ' and +1 Oracle assist' : ''}`, {
      fontSize: '15px',
      color: C.warn,
      stroke: '#06101a',
      strokeThickness: 3
    }).setOrigin(0.5);
  },

  createStatusText(centerX, y) {
    const text = this.snapshot.completed
      ? 'Already cleared. You can replay for practice, but rewards are awarded once.'
      : 'Arrange the words, then submit your answer.';

    this.statusText = this.add.text(centerX, y, text, {
      fontSize: '18px',
      color: this.snapshot.completed ? C.warn : C.sub,
      stroke: '#06101a',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);
  },

  createFooterActions(centerX, y) {
    this.makeButton(centerX - 170, y, 150, 42, 'RESET', () => this.resetCards());
    this.makeButton(centerX, y, 170, 42, 'SUBMIT', () => this.submitChallenge());
    this.makeButton(centerX + 190, y, 150, 42, 'BACK', () => this.closeScene());
  },

  setStatusMessage(text, color) {
    this.statusText.setText(text);
    this.statusText.setColor(color);
  },

  makeButton(x, y, width, height, label, onClick) {
    const bg = this.add.graphics();
    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    };

    draw(0x20123a, C.gold);
    this.add.text(x, y, label, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: C.text,
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, width, height, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(0x2d1b55, C.glow));
    hit.on('pointerout', () => draw(0x20123a, C.gold));
    hit.on('pointerdown', () => draw(0x130b24, 0x604008));
    hit.on('pointerup', () => {
      draw(0x2d1b55, C.glow);
      onClick();
    });
  },

  closeScene() {
    this.scene.stop();
    this.scene.resume('GameMapScene');
  }
};
