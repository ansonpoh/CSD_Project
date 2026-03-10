const UI_ASSETS = {
  panel: {
    key: 'ui-panel-a',
    load(scene) {
      scene.load.spritesheet('ui-panel-a', 'assets/ui_set/20250420manaSoul9SlicesA-Sheet.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }
  },
  header: {
    key: 'ui-header-a',
    load(scene) {
      scene.load.spritesheet('ui-header-a', 'assets/ui_set/20250420manaSoulHeaderA-Sheet.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }
  },
  close: {
    key: 'ui-close-btn',
    load(scene) {
      scene.load.spritesheet('ui-close-btn', 'assets/ui_set/20250425closeButton-Sheet.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }
  },
  portrait: {
    key: 'ui-portrait-frame',
    load(scene) {
      scene.load.image('ui-portrait-frame', 'assets/ui_set/20250425portraitFrame-Sheet.png');
    }
  },
  arrow: {
    key: 'ui-arrow-r',
    load(scene) {
      scene.load.spritesheet('ui-arrow-r', 'assets/ui_set/20250425rightArrow-Sheet.png', {
        frameWidth: 28,
        frameHeight: 14
      });
    }
  }
};

function queueUiAsset(scene, config) {
  if (!scene?.textures?.exists(config.key)) {
    config.load(scene);
  }
}

export function loadSharedUiAssets(scene, options = {}) {
  const {
    includePanel = true,
    includeHeader = true,
    includeClose = false,
    includePortrait = false,
    includeArrow = false
  } = options;

  if (includePanel) queueUiAsset(scene, UI_ASSETS.panel);
  if (includeHeader) queueUiAsset(scene, UI_ASSETS.header);
  if (includeClose) queueUiAsset(scene, UI_ASSETS.close);
  if (includePortrait) queueUiAsset(scene, UI_ASSETS.portrait);
  if (includeArrow) queueUiAsset(scene, UI_ASSETS.arrow);
}
