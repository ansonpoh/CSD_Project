import { apiService } from '../../services/api.js';

export const mapRuntimeMethods = {
  createGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3d6b1f, 0.3);

    for (let x = 0; x < this.cameras.main.width; x += 64) {
      graphics.lineBetween(x, 0, x, this.cameras.main.height);
    }

    for (let y = 0; y < this.cameras.main.height; y += 64) {
      graphics.lineBetween(0, y, this.cameras.main.width, y);
    }
  },

  createTilemap() {
    if (this.editorMapData) {
      this.createEditorTilemap();
      return;
    }

    const mapKey = this.mapConfig?.mapKey;
    if (!mapKey) {
      console.error('Missing mapKey in mapConfig:', this.mapConfig);
      this.createFallbackArena();
      return;
    }

    try {
      this.map = this.make.tilemap({ key: mapKey });
    } catch (error) {
      console.error('Failed to load tilemap:', mapKey, error);
      this.createFallbackArena();
      return;
    }

    if (!this.map?.tilesets?.length) {
      this.createFallbackArena();
      return;
    }

    const jsonSets = this.cache.tilemap.get(mapKey)?.data?.tilesets || [];
    const tilesets = [];
    for (const tileset of this.map.tilesets) {
      const added = this.map.addTilesetImage(tileset.name, tileset.name);
      if (added) {
        const jsonTileset = jsonSets.find((entry) => entry.name === tileset.name);
        if (jsonTileset && (jsonTileset.margin || jsonTileset.spacing)) {
          this.fixTilesetTexCoords(added, jsonTileset);
        }
        tilesets.push(added);
      }
    }

    this.collisionLayers = [];
    this.collisionBodies = [];
    this.map.layers.forEach((layerData, layerIndex) => {
      const layer = this.map.createLayer(layerData.name, tilesets, 0, 0);
      if (!layer) return;

      const isMap1to3 = mapKey === 'map1' || mapKey === 'map2' || mapKey === 'map3';

      const collidesByName = /collision|collide|wall|blocked|barrier/i.test(String(layerData.name || ''));
      const hasCollidesProperty = layer.layer.properties?.some?.((prop) => prop.name === 'collides' && prop.value === true);

      // Forest and cave and mountain rule: first 2 layers (0,1) no collision; layers 2 onwards collide
      const shouldCollide = isMap1to3 ? layerIndex >= 2 : (collidesByName || hasCollidesProperty);

      if (isMap1to3) {
        if (shouldCollide) layer.setCollisionByExclusion([-1]);
      } else {
        layer.setCollisionByProperty({ collides: true });
        if (collidesByName) layer.setCollisionByExclusion([-1]);
      }

      if (shouldCollide) this.collisionLayers.push(layer);
    });
  },

  createFallbackArena() {
    const arenaWidth = 2200;
    const arenaHeight = 1400;
    this.map = {
      widthInPixels: arenaWidth,
      heightInPixels: arenaHeight
    };
    this.collisionLayers = [];
    this.collisionBodies = [];

    this.add.rectangle(arenaWidth / 2, arenaHeight / 2, arenaWidth, arenaHeight, 0x213a24).setDepth(-20);

    const wallDefs = [
      { x: arenaWidth / 2, y: 20, w: arenaWidth, h: 40 },
      { x: arenaWidth / 2, y: arenaHeight - 20, w: arenaWidth, h: 40 },
      { x: 20, y: arenaHeight / 2, w: 40, h: arenaHeight },
      { x: arenaWidth - 20, y: arenaHeight / 2, w: 40, h: arenaHeight },
      { x: arenaWidth / 2, y: arenaHeight / 2, w: 180, h: 220 },
      { x: arenaWidth / 2 + 380, y: arenaHeight / 2 - 180, w: 160, h: 160 }
    ];

    wallDefs.forEach((wall) => {
      const rect = this.add.rectangle(wall.x, wall.y, wall.w, wall.h, 0x314d38, 1).setDepth(-10);
      this.physics.add.existing(rect, true);
      this.collisionBodies.push(rect);
    });
  },

  async tryLoadEditorMapData() {
    const isEditorMap = this.mapConfig?.isEditorMap || String(this.mapConfig?.asset || '').startsWith('editor-draft:');
    const mapId = this.mapConfig?.mapId || this.mapConfig?.id;
    if (!isEditorMap || !mapId) return;

    try {
      const payload = await apiService.getEditorMapData(mapId);
      if (payload?.layers) {
        this.editorMapData = payload;
      }
    } catch (error) {
      console.error('Failed to load editor map payload:', error);
    }
  },

  createEditorTilemap() {
    const payload = this.editorMapData || {};
    const tileSize = Number(payload.tileSize || 32);
    const groundLayer = Array.isArray(payload.layers?.ground) ? payload.layers.ground : [];
    const decorLayer = Array.isArray(payload.layers?.decor) ? payload.layers.decor : [];
    const collisionLayer = Array.isArray(payload.layers?.collision) ? payload.layers.collision : [];
    const allLayers = [groundLayer, decorLayer, collisionLayer];
    const inferredHeight = allLayers.reduce((max, layer) => Math.max(max, layer.length), 0);
    const inferredWidth = allLayers.reduce((max, layer) => {
      const layerWidth = layer.reduce((rowMax, row) => {
        if (!Array.isArray(row)) return rowMax;
        return Math.max(rowMax, row.length);
      }, 0);
      return Math.max(max, layerWidth);
    }, 0);
    const width = Math.max(1, Number(payload.width) || inferredWidth || 60);
    const height = Math.max(1, Number(payload.height) || inferredHeight || 34);
    const requestedTilesetKey = payload.tilesetKey || 'terrain_tiles_v2.1';
    const fallbackTilesetKey = [
      requestedTilesetKey,
      'terrain_tiles_v2.1',
      'stone_tiles_v2.1',
      'tiles-all-32x32',
      '1_Terrains_and_Fences_32x32'
    ].find((key) => this.textures.exists(key));

    if (!fallbackTilesetKey) {
      console.error('No loaded tileset texture available for editor map:', requestedTilesetKey);
      this.createFallbackArena();
      return;
    }

    this.map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width,
      height
    });

    const tileset = this.map.addTilesetImage(fallbackTilesetKey, fallbackTilesetKey, tileSize, tileSize, 0, 0);
    if (!tileset) {
      console.error('Failed to add tileset image for editor map:', fallbackTilesetKey);
      this.createFallbackArena();
      return;
    }

    const source = this.textures.get(fallbackTilesetKey)?.getSourceImage?.();
    const maxTileIndex = source
      ? Math.max(0, Math.floor((source.width || 0) / tileSize) * Math.floor((source.height || 0) / tileSize) - 1)
      : 0;
    this.collisionLayers = [];

    [
      ['ground', groundLayer, 1],
      ['decor', decorLayer, 2],
      ['collision', collisionLayer, 3]
    ].forEach(([name, data, depth]) => {
      const layer = this.map.createBlankLayer(name, tileset, 0, 0);
      if (!layer || !Array.isArray(data)) return;

      layer.setDepth(depth);
      if (name === 'collision') layer.setAlpha(0.6);

      const writeHeight = Math.min(height, data.length);
      for (let y = 0; y < writeHeight; y += 1) {
        const row = data[y];
        if (!Array.isArray(row)) continue;
        const writeWidth = Math.min(width, row.length);
        for (let x = 0; x < writeWidth; x += 1) {
          const tileId = Number.isInteger(row[x]) ? Math.max(-1, Math.min(row[x], maxTileIndex)) : -1;
          layer.putTileAt(tileId, x, y);
        }
      }

      if (name === 'collision') {
        layer.setCollisionByExclusion([-1], true);
        this.collisionLayers.push(layer);
      }
    });
  },

  fixTilesetTexCoords(tileset, jsonTileset) {
    const tileWidth = jsonTileset.tilewidth ?? 32;
    const tileHeight = jsonTileset.tileheight ?? 32;
    const margin = jsonTileset.margin ?? 0;
    const spacing = jsonTileset.spacing ?? 0;
    const source = tileset.image?.source?.[0];
    const width = source?.width ?? jsonTileset.imagewidth ?? 0;
    const height = source?.height ?? jsonTileset.imageheight ?? 0;
    if (!width || !height) return;

    const cols = Math.floor((width - margin + spacing) / (tileWidth + spacing));
    const rows = Math.floor((height - margin + spacing) / (tileHeight + spacing));
    tileset.rows = rows;
    tileset.columns = cols;
    tileset.total = cols * rows;
    tileset.texCoordinates.length = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        tileset.texCoordinates.push({
          x: margin + col * (tileWidth + spacing),
          y: margin + row * (tileHeight + spacing)
        });
      }
    }
  },

  createPlayer() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const hasTexture = this.textures.exists('soldier');

    this.player = this.physics.add.sprite(width / 2, height / 2, hasTexture ? 'soldier' : '', 0);

    if (hasTexture) {
      this.player.setScale(4);
    } else {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x4a90e2, 1);
      graphics.fillCircle(0, 0, 20);
      graphics.generateTexture('player', 40, 40);
      graphics.destroy();
      this.player.setTexture('player');
    }

    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.play('idle');
  },

  async loadEntities() {
    try {
      this.npcs = await apiService.getAllNPCs();
      this.createNPCs();

      this.monsters = await apiService.getAllMonsters();
      this.createMonsters();
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  }
};
