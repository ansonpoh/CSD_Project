import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';

export const worldMapUtilityMethods = {
  getMockMaps() {
    return [
      { id: 1, name: 'Forest Clearing', description: 'A peaceful forest filled with mysteries', mapKey: 'map1' },
      { id: 2, name: 'Dark Cave', description: 'A dangerous cave system with hidden treasures', mapKey: 'map2' },
      { id: 3, name: 'Mountain Peak', description: 'The highest mountain in the realm', mapKey: 'map3' },
      { id: 4, name: 'Makers Garden', description: 'A prototype space for bold remix ideas', mapKey: 'map4' }
    ];
  },

  async createDemoMap() {
    try {
      const demoMap = {
        name: 'Forest Clearing',
        description: 'A peaceful forest clearing',
        asset: 'forest_tileset',
        world: null
      };
      const createdMap = await apiService.addMap(demoMap);
      this.rawMaps = [createdMap];
    } catch (error) {
      console.error('Failed to create demo map:', error);
      this.rawMaps = this.getMockMaps();
    }
  },

  refreshCatalog() {
    const learner = gameState.getLearner();
    this.catalog = mapDiscoveryService.buildCatalog(this.rawMaps, learner);
    this.selectedMap = this.catalog.find((map) => String(map.mapId) === String(this.selectedMapId)) || this.catalog[0] || null;
    this.selectedMapId = this.selectedMap?.mapId || null;
  },

  truncate(text, maxLen) {
    const s = String(text ?? '');
    return s.length > maxLen ? `${s.slice(0, maxLen - 1)}...` : s;
  },

  formatCompact(value) {
    const num = Number(value || 0);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  },

  enterMap(map) {
    const isEditorMap = String(map?.asset || '').startsWith('editor-draft:');
    const normalizedMap = {
      ...map,
      mapKey: isEditorMap ? null : (map.mapKey || this.resolveMapKey(map)),
      isEditorMap
    };

    mapDiscoveryService.markMapVisited(normalizedMap);
    gameState.setCurrentMap(normalizedMap);
    this.scene.start('GameMapScene', { mapConfig: normalizedMap });
  },

  resolveMapKey(map) {
    const raw = String(map?.mapKey || map?.asset || map?.name || '').toLowerCase();
    if (raw.startsWith('editor-draft:')) return null;
    if (raw === 'map1' || raw.includes('forest')) return 'map1';
    if (raw === 'map2' || raw.includes('cave')) return 'map2';
    if (raw === 'map3' || raw.includes('mountain')) return 'map3';
    if (raw === 'map4' || raw.includes('test') || raw.includes('terrain') || raw.includes('garden')) return 'map4';
    return 'map1';
  }
};
