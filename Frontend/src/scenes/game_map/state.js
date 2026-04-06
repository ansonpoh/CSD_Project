import { gameState } from '../../services/gameState.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';

export function initializeSceneState(scene) {
  scene.player = null;
  scene.playerCtrl = null;
  scene.cursors = null;
  scene.npcs = [];
  scene.monsters = [];
  scene.npcSprites = [];
  scene.monsterSprites = [];
  scene.interactKey = null;
  scene.interactPrompt = null;
  scene.interactPromptBg = null;
  scene.closestNpcSprite = null;
  scene.closestMonsterSprite = null;
  scene.npcInteractDistance = 120;
  scene.monsterInteractDistance = 95;
  scene.map = null;
  scene.collisionBodies = [];
  scene.npcMonsterMap = new Map();
  scene.monsterSpriteByNpcKey = new Map();
  scene.revealedMonsterNpcKeys = new Set();
  scene.pendingMonsterUnlockNpcKeys = [];
  scene.encounterProgressByNpcKey = new Map();
  scene.encounterState = null;
  scene.missionText = null;
  scene.missionCard = null;
  scene.missionCardBounds = null;
  scene.lastMissionSnapshot = '';
  scene.questTitleText = null;
  scene.questStepsText = null;
  scene.questCard = null;
  scene.questCardBounds = null;
  scene.claimRewardButton = null;
  scene.mapBannerText = null;
  scene.mapSignalText = null;
  scene.mapBannerCard = null;
  scene.mapBannerCardBounds = null;
  scene.mapEventButton = null;
  scene.sideChallengeButton = null;
  scene.eventOverlay = null;
  scene.eventPanel = null;
  scene.rewardClaimFx = null;
  scene.rewardClaimFxTimer = null;
  scene.mapCompletionRecorded = false;
  scene.mapStartedCompleted = false;
  scene.activeLoadToken = null;
}

export function resetSceneState(scene, data) {
  scene.mapConfig = data?.mapConfig || {};
  scene.editorMapData = scene.mapConfig?.editorMapData || null;

  scene.player = null;
  scene.playerCtrl = null;
  scene.cursors = null;
  scene.npcs = [];
  scene.monsters = [];
  scene.npcSprites = [];
  scene.monsterSprites = [];
  scene.interactKey = null;
  scene.interactPrompt = null;
  scene.interactPromptBg = null;
  scene.closestMonsterSprite = null;
  scene.collisionBodies = [];
  scene.npcMonsterMap = new Map();
  scene.monsterSpriteByNpcKey = new Map();
  scene.revealedMonsterNpcKeys = new Set();
  scene.pendingMonsterUnlockNpcKeys = [];
  scene.encounterProgressByNpcKey = new Map();
  scene.encounterState = null;
  scene.missionText = null;
  scene.missionCard = null;
  scene.missionCardBounds = null;
  scene.lastMissionSnapshot = '';
  scene.closestNpcSprite = null;
  scene.questTitleText = null;
  scene.questStepsText = null;
  scene.questCard = null;
  scene.questCardBounds = null;
  scene.claimRewardButton = null;
  scene.mapBannerText = null;
  scene.mapSignalText = null;
  scene.mapBannerCard = null;
  scene.mapBannerCardBounds = null;
  scene.mapEventButton = null;
  scene.sideChallengeButton = null;
  scene.eventOverlay = null;
  scene.eventPanel = null;
  scene.rewardClaimFx = null;
  scene.rewardClaimFxTimer = null;
  scene.mapCompletionRecorded = false;
  scene.mapStartedCompleted = false;
  scene.activeLoadToken = null;

  if (!scene.mapConfig.mapKey && !scene.mapConfig.isEditorMap && !scene.editorMapData) {
    const raw = String(scene.mapConfig.asset || scene.mapConfig.name || '').toLowerCase();
    const directMatch = raw.match(/\bmap([1-4])\b/);
    if (directMatch) scene.mapConfig.mapKey = `map${directMatch[1]}`;
  }

  const learner = gameState.getLearner();
  scene.mapConfig = mapDiscoveryService.buildCatalog([scene.mapConfig], learner)[0] || scene.mapConfig;
}
