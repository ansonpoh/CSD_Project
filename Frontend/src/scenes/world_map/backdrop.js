import Phaser from 'phaser';

export const worldMapBackdropMethods = {
  drawBackdrop(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, 0x090f24);
    this.add.circle(width * 0.20, height * 0.18, 260, 0x1a3266, 0.14);
    this.add.circle(width * 0.82, height * 0.32, 300, 0x204880, 0.12);
    this.add.circle(width * 0.55, height * 0.75, 420, 0x1a2f60, 0.16);

    for (let i = 0; i < 85; i += 1) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(18, Math.floor(height * 0.58)),
        Phaser.Math.Between(1, 2),
        0xcfe4ff,
        Phaser.Math.FloatBetween(0.25, 0.85)
      );

      this.tweens.add({
        targets: dot,
        alpha: Phaser.Math.FloatBetween(0.35, 1),
        duration: Phaser.Math.Between(1200, 2600),
        yoyo: true,
        repeat: -1
      });
    }
  },

  getCloudConfigForCurrentTime() {
    const hour = new Date().getHours();
    const cloudSet = Math.floor(hour / 3) + 1;
    const layerCountsBySet = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 5, 6: 6, 7: 4, 8: 6 };
    return { cloudSet, cloudLayerCount: layerCountsBySet[cloudSet] || 4 };
  },

  createHomeCloudBackdrop(width, height) {
    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      const drift = 20 + i * 14;
      const cloud = this.add.image(width / 2, height / 2, `home-cloud-${i}`);
      const requiredWidth = width + drift * 2 + 120;
      const requiredHeight = height + 120;
      const scale = Math.max(requiredWidth / cloud.width, requiredHeight / cloud.height);

      cloud.setScale(scale);
      cloud.setAlpha(Math.min(0.06 + i * 0.035, 0.2));
      cloud.setDepth(2 + i);

      this.tweens.add({
        targets: cloud,
        x: { from: width / 2 - drift, to: width / 2 + drift },
        duration: 22000 + i * 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
};
