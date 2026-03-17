import { NPCRegistry } from '../../../characters/npcs/NPCRegistry.js';
import { gameState } from '../../../services/gameState.js';
import { P } from '../constants.js';

export const dialogueSceneLayoutMethods = {
  registerLifecycleHandlers() {
    const cleanup = () => this.cleanupSceneResources();
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
  },

  cleanupSceneResources() {
    this.destroyReportModal();
    this.destroyRatingModal();
    this.clearLessonMedia();
    this.unbindSceneHotkeys();
  },

  buildSceneUi() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.78).setOrigin(0);

    const layout = this.getLessonLayout(width, height);
    this.lessonPanelBox = { x: width / 2, y: layout.lessonY, w: layout.lessonW, h: layout.lessonH };

    this.drawLessonPanel(width, layout.lessonY, layout.lessonW, layout.lessonH);
    this.createLessonTexts(width, layout.lessonY, layout.lessonW, layout.lessonH);
    this.createReportButton(width, layout.lessonY, layout.lessonW, layout.lessonH);
    this.createRatingButton(width, layout.lessonY, layout.lessonW, layout.lessonH);
    this.createRatingSummary(width, layout.lessonY, layout.lessonW, layout.lessonH);
    this.createPageIndicator(width, layout.lessonY, layout.lessonH);
    this.createNavigationHint(width, layout.lessonY, layout.lessonW, layout.lessonH);
    this.createPortraitSection(height);
    this.createDialogueSection(width, height, layout.lessonY, layout.lessonW, layout.lessonH);
    this.renderPage();
  },

  getLessonLayout(width, height) {
    const narrationY = height - 150;
    const narrationTop = narrationY - 100;
    const lessonH = Math.min(520, height * 0.5);
    const lessonY = (narrationTop - 50) - lessonH / 2;
    const lessonW = Math.min(1100, width - 240);
    return { lessonH, lessonW, lessonY };
  },

  drawLessonPanel(width, lessonY, lessonW, lessonH) {
    const lessonPanel = this.add.graphics();
    lessonPanel.fillStyle(P.bgPanel, 0.97);
    lessonPanel.fillRoundedRect(width / 2 - lessonW / 2, lessonY - lessonH / 2, lessonW, lessonH, 6);
    lessonPanel.lineStyle(2, P.borderGold, 0.8);
    lessonPanel.strokeRoundedRect(width / 2 - lessonW / 2, lessonY - lessonH / 2, lessonW, lessonH, 6);
    lessonPanel.lineStyle(1, P.accentGlow, 0.3);
    lessonPanel.beginPath();
    lessonPanel.moveTo(width / 2 - lessonW / 2 + 16, lessonY - lessonH / 2 + 2);
    lessonPanel.lineTo(width / 2 + lessonW / 2 - 16, lessonY - lessonH / 2 + 2);
    lessonPanel.strokePath();
  },

  createLessonTexts(width, lessonY, lessonW, lessonH) {
    this.lessonTitleText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 22,
      '',
      {
        fontSize: '28px',
        fontStyle: 'bold',
        color: P.textTitle,
        stroke: '#060814',
        strokeThickness: 6
      }
    );

    this.lessonBodyText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 78,
      '',
      {
        fontSize: '20px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4,
        wordWrap: { width: lessonW - 56 }
      }
    );
  },

  createReportButton(width, lessonY, lessonW, lessonH) {
    if (!gameState.getLearner() || !this.getContentId()) return;

    this.reportButton = this._makeActionButton(
      width / 2 + lessonW / 2 - 246,
      lessonY - lessonH / 2 + 18,
      104,
      30,
      'REPORT',
      () => this.openReportModal()
    );
  },

  createRatingButton(width, lessonY, lessonW, lessonH) {
    if (!gameState.getLearner() || !this.getContentId()) return;

    this.ratingButton = this._makeActionButton(
      width / 2 + lessonW / 2 - 132,
      lessonY - lessonH / 2 + 18,
      104,
      30,
      'RATE',
      () => this.openRatingModal()
    );
  },

  createRatingSummary(width, lessonY, lessonW, lessonH) {
    this.ratingSummaryText = this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY - lessonH / 2 + 52,
      '',
      {
        fontSize: '13px',
        color: P.textGold,
        stroke: '#060814',
        strokeThickness: 3
      }
    );
    this.refreshRatingSummary();
  },

  createPageIndicator(width, lessonY, lessonH) {
    this.pageIndicatorText = this.add.text(
      width / 1.34,
      lessonY - lessonH / 2 + 450,
      '',
      {
        fontSize: '22px',
        fontStyle: 'bold',
        color: P.textTitle,
        stroke: '#060814',
        strokeThickness: 5
      }
    );
  },

  createNavigationHint(width, lessonY, lessonW, lessonH) {
    this.add.text(
      width / 2 - lessonW / 2 + 28,
      lessonY + lessonH / 2 - 28,
      'LEFT / RIGHT to navigate   |   SPACE to close',
      {
        fontSize: '13px',
        color: P.textDim,
        stroke: '#060814',
        strokeThickness: 3
      }
    );
  },

  createPortraitSection(height) {
    const portraitX = 100;
    const portraitY = height - 150;
    const portraitFrame = this.add.graphics();
    portraitFrame.fillStyle(P.bgPortrait, 1);
    portraitFrame.fillRoundedRect(portraitX - 62, portraitY - 62, 124, 124, 6);
    portraitFrame.lineStyle(2, P.borderGold, 0.85);
    portraitFrame.strokeRoundedRect(portraitX - 62, portraitY - 62, 124, 124, 6);
    portraitFrame.lineStyle(1, P.accentGlow, 0.25);
    portraitFrame.strokeRoundedRect(portraitX - 58, portraitY - 58, 116, 116, 5);

    this.npcKey = this.npc?.name || '';
    this.npcDef = NPCRegistry[this.npcKey] || { portraitOffsetY: 0, scale: 1 };
    this.createNPCIcon(portraitX, portraitY - this.npcDef.portraitOffsetY);

    const nameBg = this.add.graphics();
    nameBg.fillStyle(P.btnNormal, 1);
    nameBg.lineStyle(1, P.borderGold, 0.7);
    nameBg.fillRoundedRect(portraitX - 54, portraitY + 64, 108, 24, 4);
    nameBg.strokeRoundedRect(portraitX - 54, portraitY + 64, 108, 24, 4);

    this.add.text(portraitX, portraitY + 76, this.npc.name, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: P.textGold,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5);
  },

  createDialogueSection(width, height, lessonY, lessonW, lessonH) {
    const dialogueWidth = width - 300;
    const dialogueX = width / 2 + 50;
    const dialogueY = height - 150;
    const dialoguePanel = this.add.graphics();
    dialoguePanel.fillStyle(P.bgDialogue, 0.96);
    dialoguePanel.fillRoundedRect(dialogueX - dialogueWidth / 2, dialogueY - 100, dialogueWidth, 200, 6);
    dialoguePanel.lineStyle(2, P.borderGold, 0.75);
    dialoguePanel.strokeRoundedRect(dialogueX - dialogueWidth / 2, dialogueY - 100, dialogueWidth, 200, 6);
    dialoguePanel.lineStyle(1, P.accentGlow, 0.2);
    dialoguePanel.beginPath();
    dialoguePanel.moveTo(dialogueX - dialogueWidth / 2 + 12, dialogueY - 98);
    dialoguePanel.lineTo(dialogueX + dialogueWidth / 2 - 12, dialogueY - 98);
    dialoguePanel.strokePath();

    this.dialogueText = this.add.text(230, height - 230, '', {
      fontSize: '19px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 4,
      wordWrap: { width: width - 350 }
    });

    this.add.text(width - 330, height - 72, 'Press SPACE to close', {
      fontSize: '13px',
      color: P.textDim,
      fontStyle: 'italic',
      stroke: '#060814',
      strokeThickness: 3
    });

    this._makeDlgNavBtn(width / 2 - lessonW / 2 + lessonW - 100, lessonY + lessonH / 2 - 36, '<', () => this.prevPage());
    this._makeDlgNavBtn(width / 2 - lessonW / 2 + lessonW - 54, lessonY + lessonH / 2 - 36, '>', () => this.nextPage());
  },

  createNPCIcon(x, y) {
    const npcKey = this.npc?.name || '';
    if (!npcKey || !this.textures.exists(npcKey)) return;

    this.add.sprite(x, y, npcKey, 0)
      .setDisplaySize(96, 96)
      .setDepth(10)
      .setScale(this.npcDef.scale);
  }
};
