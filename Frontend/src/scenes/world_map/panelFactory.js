import Phaser from 'phaser';
import { soldier } from '../../characters/soldier/Soldier.js';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapPanelFactoryMethods = {
  createWindowPanel(x, y, cols, rows, title) {
    const tile = this.uiTileSize;
    const width = cols * tile;
    const height = rows * tile;
    const container = this.add.container(x, y).setDepth(50);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const top = row === 0;
        const bottom = row === rows - 1;
        const left = col === 0;
        const right = col === cols - 1;
        let frame = 4;

        if (top && left) frame = 0;
        else if (top && right) frame = 2;
        else if (bottom && left) frame = 6;
        else if (bottom && right) frame = 8;
        else if (top) frame = 1;
        else if (bottom) frame = 7;
        else if (left) frame = 3;
        else if (right) frame = 5;

        container.add(
          this.add.sprite(col * tile + tile / 2, row * tile + tile / 2, 'ui-panel-a', frame).setScale(tile / 32)
        );
      }
    }

    for (let col = 0; col < cols; col += 1) {
      const headerFrame = col === 0 ? 0 : col === cols - 1 ? 2 : 1;
      container.add(
        this.add.sprite(col * tile + tile / 2, tile / 2, 'ui-header-a', headerFrame).setScale(tile / 32)
      );
    }

    container.add(
      this.add.text(width / 2, 28, title, {
        fontSize: '28px',
        color: '#f4f8ff',
        fontStyle: 'bold',
        stroke: '#13233d',
        strokeThickness: 7
      }).setOrigin(0.5)
    );

    const body = this.add.container(0, 58);
    container.add(body);

    return { container, body, x, y, width, height, pad: 22 };
  },

  clearPanelBody(panel) {
    if (panel?.scrollState?.wheelHandler) {
      this.input.off('wheel', panel.scrollState.wheelHandler);
    }
    if (panel?.scrollState?.hitZone) {
      panel.scrollState.hitZone.destroy();
    }
    if (panel?.scrollState?.maskGraphics) {
      panel.scrollState.maskGraphics.destroy();
    }
    if (panel?.scrollState?.mask) {
      panel.scrollState.mask.destroy();
    }

    panel.scrollState = null;
    panel.body.removeAll(true);
  },

  createScrollableBody(panel, options = {}) {
    const headerHeight = 58;
    const margins = {
      left: options.left ?? 10,
      right: options.right ?? 10,
      top: options.top ?? 8,
      bottom: options.bottom ?? 10
    };
    const viewport = {
      x: margins.left,
      y: margins.top,
      width: panel.width - margins.left - margins.right,
      height: panel.height - headerHeight - margins.top - margins.bottom
    };

    const content = this.add.container(viewport.x, viewport.y);
    panel.body.add(content);

    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(
      panel.x + viewport.x,
      panel.y + headerHeight + viewport.y,
      viewport.width,
      viewport.height
    );
    const mask = maskGraphics.createGeometryMask();
    content.setMask(mask);
    maskGraphics.setVisible(false);

    const hitZone = this.add
      .zone(
        panel.x + viewport.x + viewport.width / 2,
        panel.y + headerHeight + viewport.y + viewport.height / 2,
        viewport.width,
        viewport.height
      )
      .setInteractive();

    panel.scrollState = {
      content,
      viewport,
      contentHeight: 0,
      offset: 0,
      maxOffset: 0,
      hitZone,
      maskGraphics,
      mask
    };

    const wheelHandler = (pointer, _gameObjects, _deltaX, deltaY) => {
      const bounds = new Phaser.Geom.Rectangle(
        panel.x + viewport.x,
        panel.y + headerHeight + viewport.y,
        viewport.width,
        viewport.height
      );
      if (!bounds.contains(pointer.x, pointer.y)) return;
      this.setPanelScrollOffset(panel, panel.scrollState.offset + deltaY * 0.75);
    };

    panel.scrollState.wheelHandler = wheelHandler;
    this.input.on('wheel', wheelHandler);

    return content;
  },

  setPanelScrollMetrics(panel, contentHeight) {
    if (!panel?.scrollState) return;
    panel.scrollState.contentHeight = Math.max(0, contentHeight);
    panel.scrollState.maxOffset = Math.max(0, panel.scrollState.contentHeight - panel.scrollState.viewport.height);
    this.setPanelScrollOffset(panel, panel.scrollState.offset);
  },

  setPanelScrollOffset(panel, nextOffset) {
    if (!panel?.scrollState) return;
    panel.scrollState.offset = Phaser.Math.Clamp(nextOffset, 0, panel.scrollState.maxOffset);
    panel.scrollState.content.y = panel.scrollState.viewport.y - panel.scrollState.offset;
  },

  isPointerInsidePanelViewport(panel, pointer) {
    if (!panel?.scrollState?.viewport || !pointer) return false;
    const headerHeight = 58;
    const viewport = panel.scrollState.viewport;
    const bounds = new Phaser.Geom.Rectangle(
      panel.x + viewport.x,
      panel.y + headerHeight + viewport.y,
      viewport.width,
      viewport.height
    );
    return bounds.contains(pointer.x, pointer.y);
  },

  getGuardedInputConfig(width, height, clickGuard = null) {
    return {
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: (hitArea, x, y) => {
        if (!hitArea.contains(x, y)) return false;
        if (!clickGuard) return true;
        const pointer = this.input?.activePointer;
        return Boolean(pointer && clickGuard(pointer));
      }
    };
  },

  createMapCard(x, y, width, height, map, isSelected, onClick, clickGuard = null) {
    const card = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border, alpha = 1) => {
      bg.clear();
      bg.fillStyle(fill, alpha);
      bg.fillRoundedRect(0, 0, width, height, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, width, height, 6);
      bg.fillStyle(0xffffff, 0.05);
      bg.fillRoundedRect(2, 2, width - 4, height * 0.42, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(isSelected ? 0x20386a : 0x1a1736, isSelected ? P.borderGlow : P.borderGold, map.unlocked ? 1 : 0.88);
    card.add(bg);

    const textColor = map.unlocked ? P.textMain : P.textDisabled;
    card.add(this.add.text(16, 12, map.name || 'Unnamed Map', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: textColor,
      stroke: '#060814',
      strokeThickness: 5
    }));

    card.add(this.add.text(16, 40, `${map.theme}  |  ${map.difficulty}  |  ${map.estimatedMinutes} min`, {
      fontSize: '13px',
      color: map.unlocked ? P.gold : P.textDisabled,
      stroke: '#060814',
      strokeThickness: 3
    }));

    card.add(this.add.text(16, 60, this.truncate(map.learningGoal, 82), {
      fontSize: '13px',
      color: map.unlocked ? P.textDesc : P.textDisabled,
      stroke: '#060814',
      strokeThickness: 3
    }));

    const badge = this.add.text(width - 12, 12, map.featured ? 'FEATURED' : map.seasonalTag.toUpperCase(), {
      fontSize: '12px',
      fontStyle: 'bold',
      color: map.featured ? P.good : P.warn,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(1, 0);
    card.add(badge);

    const social = `${map.socialProof.rating.toFixed(1)}\u2605  ${this.formatCompact(map.socialProof.likes)} likes  ${this.formatCompact(map.socialProof.completions)} clears`;
    card.add(this.add.text(width - 12, 58, social, {
      fontSize: '12px',
      color: textColor,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(1, 0));

    const hit = this.add
      .rectangle(width / 2, height / 2, width, height, 0, 0)
      .setInteractive(this.getGuardedInputConfig(width, height, clickGuard));
    card.add(hit);
    hit.on('pointerover', () => draw(isSelected ? 0x27457b : 0x211b46, P.borderGlow));
    hit.on('pointerout', () => {
      draw(isSelected ? 0x20386a : 0x1a1736, isSelected ? P.borderGlow : P.borderGold, map.unlocked ? 1 : 0.88);
    });
    hit.on('pointerdown', () => draw(0x120722, P.borderDim, map.unlocked ? 1 : 0.88));
    hit.on('pointerup', (pointer) => {
      if (clickGuard && !clickGuard(pointer)) return;
      onClick();
    });

    return card;
  },

  createButton(x, y, width, height, label, onClick, disabled = false, clickGuard = null) {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border, glowLine) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, width, height, 4);
      bg.lineStyle(2, border, disabled ? 0.35 : 1);
      bg.strokeRoundedRect(0, 0, width, height, 4);

      if (!disabled) {
        bg.fillStyle(0xffffff, 0.05);
        bg.fillRoundedRect(2, 2, width - 4, height * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
        bg.lineStyle(1, glowLine, 0.55);
        bg.beginPath();
        bg.moveTo(8, 2);
        bg.lineTo(width - 8, 2);
        bg.strokePath();
      }
    };

    draw(disabled ? P.btnDisabled : P.btnNormal, disabled ? P.borderDim : P.borderGold, P.accentGlow);
    btn.add(bg);

    btn.add(this.add.text(width / 2, height / 2, this.truncate(label, 34), {
      fontSize: '15px',
      fontStyle: 'bold',
      color: disabled ? P.textDisabled : P.textMain,
      stroke: '#060814',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5));

    if (!disabled && onClick) {
      const hit = this.add
        .rectangle(width / 2, height / 2, width, height, 0, 0)
        .setInteractive(this.getGuardedInputConfig(width, height, clickGuard));
      btn.add(hit);
      hit.on('pointerover', () => draw(P.btnHover, P.borderGlow, P.accentGlow));
      hit.on('pointerout', () => draw(P.btnNormal, P.borderGold, P.accentGlow));
      hit.on('pointerdown', () => draw(P.btnPress, P.borderDim, P.borderGold));
      hit.on('pointerup', (pointer) => {
        if (clickGuard && !clickGuard(pointer)) return;
        draw(P.btnHover, P.borderGlow, P.accentGlow);
        onClick();
      });
    }

    return btn;
  },

  ensureWorldIdleAnimation() {
    if (this.anims.exists('wm_soldier_idle')) return;

    const idle = soldier.anims.idle;
    const frames = Array.from({ length: idle.count }, (_, i) => idle.row * soldier.maxCols + i);
    this.anims.create({
      key: 'wm_soldier_idle',
      frames: this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
      frameRate: idle.frameRate,
      repeat: idle.repeat
    });
  }
};

