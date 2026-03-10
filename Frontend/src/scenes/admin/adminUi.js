export function createActionCard(scene, { x, y, w, h, title, subtitle, onClick }) {
  const container = scene.add.container(x - w / 2, y - h / 2);
  const bg = scene.add.graphics();

  const draw = (fill, border) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(2, border, 1);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    bg.fillStyle(0xffffff, 0.05);
    bg.fillRoundedRect(2, 2, w - 4, h * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
  };

  draw(0x4a2218, 0xd49a83);
  container.add(bg);
  container.add(scene.add.text(w / 2, 42, title, {
    fontSize: '20px',
    fontStyle: 'bold',
    color: '#fff0e8',
    stroke: '#240d09',
    strokeThickness: 4
  }).setOrigin(0.5));
  container.add(scene.add.text(w / 2, 92, subtitle, {
    fontSize: '14px',
    color: '#f3c7b3',
    align: 'center',
    wordWrap: { width: w - 24 }
  }).setOrigin(0.5));

  const hit = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerover', () => draw(0x643125, 0xf0bea8));
  hit.on('pointerout', () => draw(0x4a2218, 0xd49a83));
  hit.on('pointerdown', () => draw(0x32140f, 0xbd7e61));
  hit.on('pointerup', async () => {
    draw(0x643125, 0xf0bea8);
    try {
      await onClick();
    } catch (error) {
      showToast(scene, error?.message || 'Action failed');
    }
  });

  return container;
}

export function createButton(scene, { x, y, w, h, label, onClick, normal, hover }) {
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();

  const draw = (fill, border) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(0, 0, w, h, 5);
    bg.lineStyle(2, border, 1);
    bg.strokeRoundedRect(0, 0, w, h, 5);
  };

  draw(normal, 0xc8870a);
  container.add(bg);
  container.add(scene.add.text(w / 2, h / 2, label, {
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#fff3ed',
    stroke: '#210e0a',
    strokeThickness: 4
  }).setOrigin(0.5));

  const hit = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerover', () => draw(hover, 0xf0b030));
  hit.on('pointerout', () => draw(normal, 0xc8870a));
  hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
  hit.on('pointerup', onClick);

  return container;
}

export function showToast(scene, message) {
  const text = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height - 40, message, {
    fontSize: '14px',
    color: '#fff3ed',
    backgroundColor: '#3b1e17',
    padding: { x: 12, y: 8 }
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: text,
    alpha: 0,
    y: text.y - 10,
    duration: 1400,
    onComplete: () => text.destroy()
  });
}
