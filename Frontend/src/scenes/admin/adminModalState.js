const MODAL_KEYS = [
  'reviewQueueModal',
  'contributorAccountsModal',
  'telemetryModal',
  'flagQueueModal'
];

export function setSceneModal(scene, key, modal) {
  scene[key] = modal;
  updateSceneInputInteractivity(scene);
}

export function destroySceneModal(scene, key) {
  const modal = scene[key];
  if (modal?.parentNode) {
    modal.parentNode.removeChild(modal);
  }
  scene[key] = null;
  updateSceneInputInteractivity(scene);
}

export function updateSceneInputInteractivity(scene) {
  if (!scene.input) return;
  scene.input.enabled = !MODAL_KEYS.some((key) => scene[key]);
}

export function destroyAdminModals(scene) {
  MODAL_KEYS.forEach((key) => {
    destroySceneModal(scene, key);
  });
}
