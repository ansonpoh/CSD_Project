const LAYER_COUNTS_BY_SET = {
  1: 4,
  2: 4,
  3: 4,
  4: 4,
  5: 5,
  6: 6,
  7: 4,
  8: 6
};

export function getCloudConfigForCurrentTime(date = new Date()) {
  const hour = date.getHours();
  const cloudSet = Math.floor(hour / 3) + 1;

  return {
    cloudSet,
    cloudLayerCount: LAYER_COUNTS_BY_SET[cloudSet] || 4
  };
}

export function preloadLoginClouds(scene) {
  const { cloudSet, cloudLayerCount } = getCloudConfigForCurrentTime();

  scene.cloudSet = cloudSet;
  scene.cloudLayerCount = cloudLayerCount;

  for (let i = 1; i <= cloudLayerCount; i += 1) {
    scene.load.image(
      `login-cloud-${i}`,
      `/assets/Clouds/Clouds%20${cloudSet}/${i}.png`
    );
  }
}

function getSkyColorForCurrentTime(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) return 0xffc48c;
  if (hour >= 8 && hour < 17) return 0x87c8ff;
  if (hour >= 17 && hour < 20) return 0xff8f70;
  return 0x0b1736;
}

export function createTimeBasedBackground(scene, width, height) {
  scene.add
    .rectangle(width / 2, height / 2, width, height, getSkyColorForCurrentTime())
    .setDepth(-200);

  for (let i = 1; i <= scene.cloudLayerCount; i += 1) {
    const drift = 40 + i * 25;
    const cloud = scene.add.image(width / 2, height / 2, `login-cloud-${i}`).setDepth(-150 + i);
    const requiredWidth = width + drift * 2 + 160;
    const requiredHeight = height + 120;
    const scale = Math.max(requiredWidth / cloud.width, requiredHeight / cloud.height);
    cloud.setScale(scale);
    cloud.setAlpha(Math.min(0.22 + i * 0.07, 0.78));

    scene.tweens.add({
      targets: cloud,
      x: { from: width / 2 - drift, to: width / 2 + drift },
      duration: 9000 + i * 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
