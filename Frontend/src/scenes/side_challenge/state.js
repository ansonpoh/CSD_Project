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
  scene.snapshot = getChallengeSnapshot(scene.mapConfig, {
    serverChallenge: data?.serverChallenge,
    serverProgress: data?.serverProgress
  });

  // If the caller pre-fetched a challenge, use it.
  // Otherwise fall back to a locally randomized challenge.
  if (data?.serverChallenge) {
    scene.challenge = {
      id: String(data.serverChallenge.challengeId),
      title: data.serverChallenge.title,
      prompt: data.serverChallenge.prompt,
      orderedTokens: data.serverChallenge.orderedTokens,
      rewardXp: data.serverChallenge.rewardXp,
      rewardAssist: data.serverChallenge.rewardAssist
    };
  } else {
    scene.challenge = scene.snapshot.challenge;
  }

  scene.slotZones = [];
  scene.cards = [];
  scene.statusText = null;
}
