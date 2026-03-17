import Phaser from 'phaser';
import { apiService } from '../../services/api.js';
import { dailyQuestService } from '../../services/dailyQuests.js';
import { gameState } from '../../services/gameState.js';
import { dialogueSceneMediaMethods } from './media/index.js';
import { dialogueSceneReportingMethods } from './reporting.js';
import { dialogueSceneUiMethods } from './ui/index.js';

export class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogueScene' });
    this.npc = null;
    this.dialogueIndex = 0;
    this.pageIndex = 0;
    this.lessonPages = [];
    this.lessonKey = null;
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
    this.visitedPages = new Set();
    this.renderRequestId = 0;
    this.reportModal = null;
    this.ratingModal = null;
    this.reportButton = null;
    this.ratingButton = null;
    this.ratingSummaryText = null;
    this.handleRightKey = null;
    this.handleLeftKey = null;
    this.handleSpaceKey = null;
    this.npcKey = '';
    this.npcDef = null;
    this.currentContentRating = null;
    this.modalInputSuspendCount = 0;
  }

  init(data) {
    this.npc = data?.npc || null;
    this.dialogueIndex = 0;
    this.pageIndex = 0;
    this.lessonPages = data?.lessonPages || [];
    this.lessonKey = data?.lessonKey || null;
    this.visitedPages = new Set();
    this.renderRequestId = 0;
    this.currentContentRating = {
      contentId: this.npc?.contentId || this.npc?.content_id || null,
      averageRating: Number(this.npc?.averageRating || 0),
      ratingCount: Number(this.npc?.ratingCount || 0),
      currentUserRating: this.npc?.currentUserRating ?? null
    };
  }

  create() {
    this.registerLifecycleHandlers();
    this.buildSceneUi();
    this.bindSceneHotkeys();
    void this.hydrateContentRating();
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
    this.destroyRatingModal();
    this.clearLessonMedia();
    this.scene.stop();
    this.scene.resume('GameMapScene');
  }
}

Object.assign(
  DialogueScene.prototype,
  dialogueSceneUiMethods,
  dialogueSceneReportingMethods,
  dialogueSceneMediaMethods
);
