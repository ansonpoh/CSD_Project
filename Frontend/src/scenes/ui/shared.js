export function stopPointerPropagation(target) {
  target.on('pointerdown', (pointer, localX, localY, event) => event?.stopPropagation?.());
  target.on('pointerup', (pointer, localX, localY, event) => event?.stopPropagation?.());
  return target;
}

export function createModalDismissHandlers(scene, {
  overlay,
  cleanup,
  shouldCloseOnBackdropPointerUp = null,
  closeOnBackdrop = true,
  closeOnEscape = true
} = {}) {
  if (!scene || typeof cleanup !== 'function') {
    return () => {};
  }

  const canCloseFromBackdrop = typeof shouldCloseOnBackdropPointerUp === 'function'
    ? shouldCloseOnBackdropPointerUp
    : () => true;

  const onBackdropPointerUp = (pointer, localX, localY, event) => {
    event?.stopPropagation?.();
    if (!canCloseFromBackdrop(pointer, localX, localY, event)) {
      return;
    }
    cleanup(pointer, localX, localY, event);
  };
  const onEscape = (event) => {
    if (event?.key !== 'Escape') return;
    event?.preventDefault?.();
    cleanup();
  };

  if (closeOnBackdrop && overlay?.on) {
    overlay.on('pointerup', onBackdropPointerUp);
  }
  if (closeOnEscape && scene.input?.keyboard) {
    scene.input.keyboard.on('keydown', onEscape);
  }

  return () => {
    if (closeOnBackdrop && overlay?.off) {
      overlay.off('pointerup', onBackdropPointerUp);
    }
    if (closeOnEscape && scene.input?.keyboard) {
      scene.input.keyboard.off('keydown', onEscape);
    }
  };
}

function fitTextToWidth(textObject, maxWidth, minScale = 0.65) {
  if (!textObject || !(maxWidth > 0)) return;

  textObject.setScale(1);
  const currentWidth = textObject.width;
  if (!(currentWidth > maxWidth)) return;

  const nextScale = Math.max(minScale, maxWidth / currentWidth);
  textObject.setScale(nextScale);
}

export function createUiButton(scene, config) {
  const {
    x,
    y,
    width,
    height,
    label,
    anchor = 'center',
    fillNormal,
    fillHover = fillNormal,
    borderNormal = 0xc8870a,
    borderHover = 0xf0b030,
    pressFill = 0x100520,
    pressBorder = 0x604008,
    disabled = false,
    disabledFill = fillNormal,
    disabledBorder = borderNormal,
    disabledTextColor = '#5a4a72',
    depth,
    lineWidth = 2,
    radius = 4,
    contentInset = 2,
    topGlossAlpha = 0.06,
    topGlowLineColor = null,
    topGlowLineAlpha = 0.55,
    hitConfig = null,
    textStyle = {},
    onPress
  } = config;

  const resolvedX = anchor === 'topLeft' ? x : x - (width / 2);
  const resolvedY = anchor === 'topLeft' ? y : y - (height / 2);
  const container = scene.add.container(resolvedX, resolvedY);
  if (typeof depth === 'number') {
    container.setDepth(depth);
  }

  let isEnabled = !disabled;
  const background = scene.add.graphics();
  const draw = (fill, border) => {
    background.clear();
    background.fillStyle(fill, isEnabled ? 1 : 0.35);
    background.fillRoundedRect(0, 0, width, height, radius);
    background.lineStyle(lineWidth, border, isEnabled ? 1 : 0.35);
    background.strokeRoundedRect(0, 0, width, height, radius);

    if (isEnabled && topGlossAlpha > 0) {
      background.fillStyle(0xffffff, topGlossAlpha);
      background.fillRoundedRect(
        contentInset,
        contentInset,
        Math.max(1, width - contentInset * 2),
        Math.max(1, height * 0.42),
        { tl: 3, tr: 3, bl: 0, br: 0 }
      );
    }

    if (isEnabled && topGlowLineColor !== null) {
      background.lineStyle(1, topGlowLineColor, topGlowLineAlpha);
      background.beginPath();
      background.moveTo(8, 2);
      background.lineTo(width - 8, 2);
      background.strokePath();
    }
  };

  draw(isEnabled ? fillNormal : disabledFill, isEnabled ? borderNormal : disabledBorder);
  container.add(background);

  const labelText = scene.add.text(width / 2, height / 2, label, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: isEnabled ? '#f0ecff' : disabledTextColor,
      stroke: '#060814',
      strokeThickness: 4,
      ...textStyle
    }).setOrigin(0.5);
  fitTextToWidth(labelText, Math.max(8, width - 14));
  container.add(labelText);

  const hitArea = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);

  const bindInteractive = () => {
    hitArea.removeAllListeners();
    hitArea.removeInteractive();
    if (!isEnabled || !onPress) return;

    hitArea.setInteractive(hitConfig || { useHandCursor: true });
    hitArea.on('pointerover', () => draw(fillHover, borderHover));
    hitArea.on('pointerout', () => draw(fillNormal, borderNormal));
    hitArea.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      draw(pressFill, pressBorder);
    });
    hitArea.on('pointerup', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      draw(fillHover, borderHover);
      onPress?.(pointer);
    });
  };

  container.add(hitArea);
  bindInteractive();

  container.setEnabled = (nextEnabled) => {
    isEnabled = Boolean(nextEnabled);
    labelText.setColor(isEnabled ? (textStyle.color || '#f0ecff') : disabledTextColor);
    draw(isEnabled ? fillNormal : disabledFill, isEnabled ? borderNormal : disabledBorder);
    bindInteractive();
    return container;
  };

  return container;
}
