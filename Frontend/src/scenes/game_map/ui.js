import { HUD } from './constants.js';

function createHudButton(scene, cx, cy, label, fillNormal, fillHover, onClick) {
  const width = 120;
  const height = 40;
  const container = scene.add.container(cx - width / 2, cy - height / 2).setScrollFactor(0).setDepth(120);
  const bg = scene.add.graphics();

  const draw = (fill, border) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(0, 0, width, height, 6);
    bg.lineStyle(2, border, 0.95);
    bg.strokeRoundedRect(0, 0, width, height, 6);
    bg.fillStyle(0xffffff, 0.08);
    bg.fillRoundedRect(2, 2, width - 4, height * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
  };

  draw(fillNormal, HUD.border);
  const text = scene.add.text(width / 2, height / 2, label, {
    fontSize: '18px',
    fontFamily: 'Trebuchet MS, Verdana, sans-serif',
    fontStyle: 'bold',
    color: HUD.textMain,
    stroke: '#060814',
    strokeThickness: 4
  }).setOrigin(0.5);
  const hit = scene.add.rectangle(width / 2, height / 2, width, height, 0, 0).setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => draw(fillHover, HUD.borderGlow));
  hit.on('pointerout', () => draw(fillNormal, HUD.border));
  hit.on('pointerdown', () => draw(0x120722, 0x604008));
  hit.on('pointerup', () => {
    draw(fillHover, HUD.borderGlow);
    onClick();
  });

  container.add([bg, text, hit]);
  return {
    container,
    text,
    hit,
    setEnabled(enabled) {
      if (enabled) {
        hit.setInteractive({ useHandCursor: true });
        container.setAlpha(1);
        draw(fillNormal, HUD.border);
        return;
      }

      hit.disableInteractive();
      container.setAlpha(0.45);
      draw(fillNormal, 0x3c3552);
    }
  };
}

export const uiMethods = {
  createUI() {
    const width = this.cameras.main.width;

    createHudButton(this, width - 80, 90, 'SHOP', HUD.btnBlue, HUD.btnBlueHover, () => {
      this.scene.launch('ShopScene');
      this.scene.pause();
    });
    createHudButton(this, 80, 90, 'BACK', HUD.btnPurple, HUD.btnPurpleHover, () => {
      this.scene.start('WorldMapScene', { selectedMapId: this.mapConfig?.mapId || this.mapConfig?.id });
    });

    const missionCard = this.add.graphics().setScrollFactor(0).setDepth(119);
    missionCard.fillStyle(HUD.cardBg, 0.92);
    missionCard.fillRoundedRect(width / 2 - 250, 70, 500, 54, 8);
    missionCard.lineStyle(2, HUD.border, 0.8);
    missionCard.strokeRoundedRect(width / 2 - 250, 70, 500, 54, 8);
    this.missionText = this.add.text(width / 2, 97, 'Syncing objectives...', {
      fontSize: '17px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120);

    const bannerCard = this.add.graphics().setScrollFactor(0).setDepth(119);
    bannerCard.fillStyle(HUD.cardBg, 0.92);
    bannerCard.fillRoundedRect(32, 150, 280, 124, 8);
    bannerCard.lineStyle(2, HUD.border, 0.82);
    bannerCard.strokeRoundedRect(32, 150, 280, 124, 8);
    this.mapBannerText = this.add.text(46, 164, '', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: 252 }
    }).setScrollFactor(0).setDepth(120);
    this.mapSignalText = this.add.text(46, 198, '', {
      fontSize: '13px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textSub,
      lineSpacing: 5,
      wordWrap: { width: 252 }
    }).setScrollFactor(0).setDepth(120);

    this.mapEventButton = createHudButton(this, 172, 292, 'EVENT', 0x714915, 0x93621d, () => this.openMapEventPanel());
    this.sideChallengeButton = createHudButton(this, 172, 340, 'DUEL', 0x28491f, 0x3c6d2c, () => this.openSideChallenge());

    const questX = width - 290;
    const questY = 160;
    const questW = 250;
    const questH = 230;
    const questCard = this.add.graphics().setScrollFactor(0).setDepth(119);
    questCard.fillStyle(HUD.cardBg, 0.95);
    questCard.fillRoundedRect(questX, questY, questW, questH, 8);
    questCard.lineStyle(2, HUD.border, 0.82);
    questCard.strokeRoundedRect(questX, questY, questW, questH, 8);

    this.questTitleText = this.add.text(questX + 14, questY + 12, 'Quest Chain', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: '#ffeac8',
      stroke: '#060814',
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(120);

    this.questStepsText = this.add.text(questX + 14, questY + 42, 'Loading...', {
      fontSize: '14px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textMain,
      lineSpacing: 6,
      wordWrap: { width: questW - 28 }
    }).setScrollFactor(0).setDepth(120);

    this.claimRewardButton = createHudButton(
      this,
      questX + questW / 2,
      questY + questH - 30,
      'CLAIM',
      0x1f6d34,
      0x2d9150,
      () => this.claimActiveQuestReward()
    );
    this.claimRewardButton.setEnabled(false);
    this.refreshMapSignalPanel();
  }
};
