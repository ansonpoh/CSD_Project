import { gameState } from '../../services/gameState.js';
import { getChallengeSnapshot } from '../../services/sideChallenges.js';

export function initializeSideChallengeState(scene) {
  scene.mapConfig = null;
  scene.challenge = null;
  scene.snapshot = null;
  scene.slotZones = [];
  scene.cards = [];
  scene.statusText = null;
}

export function resetSideChallengeState(scene, data) {
  scene.mapConfig = data?.mapConfig || gameState.getCurrentMap() || null;
  scene.snapshot = getChallengeSnapshot(scene.mapConfig);
  scene.challenge = scene.snapshot.challenge;
  scene.slotZones = [];
  scene.cards = [];
  scene.statusText = null;
}
