const DEFAULT_DURATION_MS = 240;
const DEFAULT_OFFSET_PX = 18;

let transitionInFlight = false;

function clampDuration(duration) {
  const value = Number(duration);
  if (!Number.isFinite(value)) return DEFAULT_DURATION_MS;
  return Math.max(200, Math.min(300, value));
}

export function transitionToScene(
  scene,
  targetSceneKey,
  targetData = {},
  { durationMs = DEFAULT_DURATION_MS, slideOffsetPx = DEFAULT_OFFSET_PX, onAfterStart } = {}
) {
  if (!scene?.scene || !targetSceneKey) return;
  if (transitionInFlight) return;

  transitionInFlight = true;
  const duration = clampDuration(durationMs);
  const offset = Number.isFinite(slideOffsetPx) ? slideOffsetPx : DEFAULT_OFFSET_PX;
  const canvas = scene.game?.canvas;

  const startScene = () => {
    scene.scene.start(targetSceneKey, targetData);
    if (typeof onAfterStart === 'function') onAfterStart();
  };

  if (!canvas?.style) {
    startScene();
    transitionInFlight = false;
    return;
  }

  const resetStyle = () => {
    canvas.style.transition = '';
    canvas.style.opacity = '';
    canvas.style.transform = '';
    canvas.style.willChange = '';
  };

  const cleanupAfterEnter = () => {
    window.setTimeout(() => {
      resetStyle();
      transitionInFlight = false;
    }, duration);
  };

  canvas.style.willChange = 'opacity, transform';
  canvas.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
  canvas.style.opacity = '1';
  canvas.style.transform = 'translateY(0px)';

  window.requestAnimationFrame(() => {
    canvas.style.opacity = '0';
    canvas.style.transform = `translateY(${offset}px)`;

    window.setTimeout(() => {
      startScene();

      canvas.style.transition = 'none';
      canvas.style.opacity = '0';
      canvas.style.transform = `translateY(${-offset}px)`;

      window.requestAnimationFrame(() => {
        canvas.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
        canvas.style.opacity = '1';
        canvas.style.transform = 'translateY(0px)';
        cleanupAfterEnter();
      });
    }, duration);
  });
}
