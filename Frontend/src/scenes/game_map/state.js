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
  scene.npcInteractDistance = 120;
  scene.map = null;
  scene.collisionBodies = [];
  scene.npcMonsterMap = new Map();
  scene.monsterSpriteByNpcKey = new Map();
  scene.revealedMonsterNpcKeys = new Set();
  scene.pendingMonsterUnlockNpcKeys = [];
  scene.encounterProgressByNpcKey = new Map();
  scene.encounterState = null;
  scene.missionText = null;
  scene.lastMissionSnapshot = '';
  scene.questTitleText = null;
  scene.questStepsText = null;
  scene.claimRewardButton = null;
  scene.mapBannerText = null;
  scene.mapSignalText = null;
  scene.mapEventButton = null;
  scene.sideChallengeButton = null;
  scene.eventOverlay = null;
  scene.eventPanel = null;
  scene.mapCompletionRecorded = false;
  scene.mapStartedCompleted = false;
  scene.activeLoadToken = null;
}

export function resetSceneState(scene, data) {
  scene.mapConfig = data?.mapConfig || { mapKey: 'map1' };
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
  scene.collisionBodies = [];
  scene.npcMonsterMap = new Map();
  scene.monsterSpriteByNpcKey = new Map();
  scene.revealedMonsterNpcKeys = new Set();
  scene.pendingMonsterUnlockNpcKeys = [];
  scene.encounterProgressByNpcKey = new Map();
  scene.encounterState = null;
  scene.lastMissionSnapshot = '';
  scene.closestNpcSprite = null;
  scene.questTitleText = null;
  scene.questStepsText = null;
  scene.claimRewardButton = null;
  scene.mapBannerText = null;
  scene.mapSignalText = null;
  scene.mapEventButton = null;
  scene.sideChallengeButton = null;
  scene.eventOverlay = null;
  scene.eventPanel = null;
  scene.mapCompletionRecorded = false;
  scene.mapStartedCompleted = false;
  scene.activeLoadToken = null;

  if (!scene.mapConfig.mapKey && !scene.mapConfig.isEditorMap && !scene.editorMapData) {
    const raw = String(scene.mapConfig.asset || scene.mapConfig.name || '').toLowerCase();
    if (raw.includes('forest')) scene.mapConfig.mapKey = 'map1';
    else if (raw.includes('cave')) scene.mapConfig.mapKey = 'map2';
    else if (raw.includes('mountain')) scene.mapConfig.mapKey = 'map3';
    else scene.mapConfig.mapKey = 'map1';
  }

  const learner = gameState.getLearner();
  scene.mapConfig = mapDiscoveryService.buildCatalog([scene.mapConfig], learner)[0] || scene.mapConfig;
}
