import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { transitionToScene } from '../shared/sceneTransition.js';

export const worldMapUtilityMethods = {
  inferUsernameFromEmail(email) {
    const text = String(email || '').trim();
    if (!text.includes('@')) return '';
    return text.split('@')[0] || '';
  },

  getContributorUsername(contributor, usernameBySupabaseId) {
    const supabaseUserId = String(contributor?.supabaseUserId || '');
    if (supabaseUserId && usernameBySupabaseId.has(supabaseUserId)) {
      return usernameBySupabaseId.get(supabaseUserId);
    }
    const fallback = String(contributor?.username || contributor?.fullName || this.inferUsernameFromEmail(contributor?.email) || '').trim();
    return fallback || 'contributor';
  },

  enrichMapCatalogMaps(rawMaps = [], contributors = [], topics = [], learners = []) {
    const safeMaps = Array.isArray(rawMaps) ? rawMaps : [];
    const safeContributors = Array.isArray(contributors) ? contributors : [];
    const safeTopics = Array.isArray(topics) ? topics : [];
    const safeLearners = Array.isArray(learners) ? learners : [];

    const usernameBySupabaseId = new Map(
      safeLearners
        .map((row) => [String(row?.supabaseUserId || ''), String(row?.username || '').trim()])
        .filter(([supabaseUserId, username]) => supabaseUserId && username)
    );

    const contributorUsernameById = new Map(
      safeContributors
        .map((row) => [String(row?.contributorId || ''), this.getContributorUsername(row, usernameBySupabaseId)])
        .filter(([contributorId, username]) => contributorId && username)
    );

    const topicNameById = new Map(
      safeTopics
        .map((row) => [String(row?.topicId || ''), String(row?.topicName || '').trim()])
        .filter(([topicId, topicName]) => topicId && topicName)
    );

    return safeMaps.map((map) => {
      const contributorId = String(map?.submittedByContributorId || '').trim();
      const contributorSupabaseUserId = String(map?.submittedByContributorSupabaseUserId || '').trim();
      const topicId = String(map?.topicId || '').trim();
      const isContributorMap = Boolean(contributorId);
      const creatorUsername = isContributorMap
        ? (
            String(map?.submittedByContributorName || '').trim()
            || String(map?.creatorName || '').trim()
            || usernameBySupabaseId.get(contributorSupabaseUserId)
            || contributorUsernameById.get(contributorId)
            || 'contributor'
          )
        : 'admin';
      const topicName = topicNameById.get(topicId) || (topicId ? 'Unknown topic' : 'Unassigned');

      return {
        ...map,
        creatorName: creatorUsername,
        creatorBadge: isContributorMap ? 'Contributor' : 'Admin',
        topicName,
        recommendedTopic: topicName
      };
    });
  },

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

  selectMap(mapId) {
    const nextMap = this.catalog.find((map) => String(map.mapId) === String(mapId));
    if (!nextMap) return;

    this.selectedMapId = nextMap.mapId;
    this.selectedMap = nextMap;
    this.renderPanels(gameState.getLearner());
  },

  async reloadMapCatalog() {
    const [maps, contributors, topics, learners] = await Promise.all([
      apiService.getAllMaps(),
      gameState.getRole() === 'admin'
        ? apiService.getAllContributors().catch(() => [])
        : Promise.resolve([]),
      apiService.getAllTopics().catch(() => []),
      apiService.getAllLearners().catch(() => [])
    ]);
    this.rawMaps = this.enrichMapCatalogMaps(maps, contributors, topics, learners);
    this.refreshCatalog();
  },

  async toggleSelectedMapLike(map) {
    if (!map?.mapId) return;
    try {
      await apiService.setMapLike(map.mapId, !map.playerState?.liked);
      await this.reloadMapCatalog();
      this.renderPanels(gameState.getLearner());
    } catch (error) {
      console.error('Failed to update map like:', error?.response?.data || error);
    }
  },

  async rateSelectedMap(map, rating) {
    if (!map?.mapId) return;
    try {
      await apiService.rateMap(map.mapId, rating);
      await this.reloadMapCatalog();
      this.renderPanels(gameState.getLearner());
    } catch (error) {
      console.error('Failed to update map rating:', error?.response?.data || error);
    }
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
      mapKey: isEditorMap ? null : (map.mapKey || this.resolveMapKey(map) || null),
      isEditorMap
    };

    mapDiscoveryService.markMapVisited(normalizedMap);
    gameState.setCurrentMap(normalizedMap);
    transitionToScene(this, 'GameMapScene', { mapConfig: normalizedMap });
  },

  resolveMapKey(map) {
    const raw = String(map?.mapKey || map?.asset || map?.name || '').toLowerCase();
    if (raw.startsWith('editor-draft:')) return null;
    const directMatch = raw.match(/\bmap([1-4])\b/);
    if (directMatch) return `map${directMatch[1]}`;
    return null;
  }
};
