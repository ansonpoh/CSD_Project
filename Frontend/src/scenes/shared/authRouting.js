import { getLoginPageUrl, getLoginSceneKey } from '../../config/authEntry.js';

export function routeToLogin(scene, { hardReload = false } = {}) {
  if (hardReload && typeof window !== 'undefined') {
    window.location.assign(getLoginPageUrl());
    return;
  }

  if (!scene?.scene?.manager) return;

  const currentKey = scene.scene.key;
  const activeScenes = scene.scene.manager.getScenes(true);

  activeScenes.forEach((activeScene) => {
    const key = activeScene?.scene?.key;
    if (!key) return;
    if (key === 'LoginScene' || key === 'AdminLoginScene' || key === 'BootScene' || key === currentKey) return;
    scene.scene.stop(key);
  });

  scene.scene.start(getLoginSceneKey());
}
