export function routeToLogin(scene, { hardReload = false } = {}) {
  if (hardReload && typeof window !== 'undefined') {
    window.location.assign(window.location.origin);
    return;
  }

  if (!scene?.scene?.manager) return;

  const currentKey = scene.scene.key;
  const activeScenes = scene.scene.manager.getScenes(true);

  activeScenes.forEach((activeScene) => {
    const key = activeScene?.scene?.key;
    if (!key) return;
    if (key === 'LoginScene' || key === 'BootScene' || key === currentKey) return;
    scene.scene.stop(key);
  });

  scene.scene.start('LoginScene');
}
