export function stopPointerPropagation(target) {
  target.on('pointerdown', (pointer, localX, localY, event) => event?.stopPropagation?.());
  target.on('pointerup', (pointer, localX, localY, event) => event?.stopPropagation?.());
  return target;
}

export function createUiButton(scene, config) {
  const {
    x,
    y,
    width,
    height,
    label,
    fillNormal,
    fillHover,
    borderNormal,
    borderHover = 0xf0b030,
    pressFill = 0x100520,
    pressBorder = 0x604008,
    depth,
    lineWidth = 2,
    textStyle = {},
    onPress
  } = config;

  const container = scene.add.container(x - width / 2, y - height / 2);
  if (typeof depth === 'number') {
    container.setDepth(depth);
  }

  const background = scene.add.graphics();
  const draw = (fill, border) => {
    background.clear();
    background.fillStyle(fill, 1);
    background.fillRoundedRect(0, 0, width, height, 4);
    background.lineStyle(lineWidth, border, 1);
    background.strokeRoundedRect(0, 0, width, height, 4);
    background.fillStyle(0xffffff, 0.06);
    background.fillRoundedRect(2, 2, width - 4, height * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
  };

  draw(fillNormal, borderNormal);
  container.add(background);

  container.add(
    scene.add.text(width / 2, height / 2, label, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f0ecff',
      stroke: '#060814',
      strokeThickness: 4,
      ...textStyle
    }).setOrigin(0.5)
  );

  const hitArea = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
    .setInteractive({ useHandCursor: true });

  container.add(hitArea);
  hitArea.on('pointerover', () => draw(fillHover, borderHover));
  hitArea.on('pointerout', () => draw(fillNormal, borderNormal));
  hitArea.on('pointerdown', (pointer, localX, localY, event) => {
    event?.stopPropagation?.();
    draw(pressFill, pressBorder);
  });
  hitArea.on('pointerup', () => {
    draw(fillHover, borderHover);
    onPress?.();
  });

  return container;
}