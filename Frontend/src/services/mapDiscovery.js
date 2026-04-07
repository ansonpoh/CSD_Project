import { loadJsonFromStorage, saveJsonToStorage } from './storage.js';

const STORAGE_KEY = 'mapDiscoveryState';

function loadState() {
  return loadJsonFromStorage(STORAGE_KEY, {}, 'map discovery state');
}

function saveState(state) {
  return saveJsonToStorage(STORAGE_KEY, state, 'map discovery state');
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hasValue(value) {
  return value !== null && value !== undefined;
}

function asText(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function pickFirstText(...values) {
  for (const value of values) {
    const text = asText(value, '');
    if (text) return text;
  }
  return '';
}

function getMapData(map) {
  const data = map?.mapData;
  return data && typeof data === 'object' ? data : null;
}

function getEventId(event) {
  const raw = asText(event?.id, '');
  return raw || null;
}

class MapDiscoveryService {
  constructor() {
    this.state = loadState();
  }

  persist() {
    saveState(this.state);
  }

  getMapId(map) {
    return String(map?.mapId || map?.id || map?.name || map?.asset || 'map');
  }

  resolveMapKey(map) {
    const raw = String(map?.mapKey || map?.asset || map?.name || '').toLowerCase();
    const directMatch = raw.match(/\bmap([1-4])\b/);
    if (directMatch) return `map${directMatch[1]}`;
    return null;
  }

  ensureMapState(map) {
    const id = this.getMapId(map);
    if (!this.state[id]) {
      const unlockLevel = Math.max(1, toNumber(map?.unlockLevel, 1));
      const seed = id.length + unlockLevel * 13;
      this.state[id] = {
        rating: clamp(4 + (seed % 7) * 0.08, 3.8, 4.8),
        ratingCount: 18 + seed * 3,
        likes: 40 + seed * 5,
        completions: 90 + seed * 7,
        visits: 0,
        featured: Boolean(map?.featured),
        trendScore: 8 + (seed % 6) * 4,
        creatorRep: 70 + seed,
        remixCount: 1 + (seed % 5),
        bonusStars: 0,
        playerLiked: false,
        playerRating: 0,
        playerCompletions: 0,
        choiceHistory: {},
        unlockedLore: false,
        assistCharges: 0
      };
      this.persist();
    }
    return this.state[id];
  }

  getGlobalState() {
    return this.state;
  }

  getPlayerLevel(learner) {
    return Math.max(1, toNumber(learner?.level, 1));
  }

  buildMapRecord(map, learner) {
    const state = this.ensureMapState(map);
    const mapData = getMapData(map);

    const unlockLevel = Math.max(1, toNumber(
      pickFirstDefined(map?.unlockLevel, mapData?.unlockLevel),
      1
    ));

    const playerLevel = this.getPlayerLevel(learner);
    const isUnlocked = playerLevel >= unlockLevel || state.playerCompletions > 0;
    const rawRatingCount = hasValue(map?.ratingCount) ? toNumber(map.ratingCount, 0) : state.ratingCount;
    const rawAverageRating = hasValue(map?.averageRating) ? clamp(toNumber(map.averageRating, 0), 0, 5) : state.rating;
    const rawLikeCount = hasValue(map?.likeCount) ? Math.max(0, toNumber(map.likeCount, 0)) : state.likes;
    const rawCurrentUserRating = hasValue(map?.currentUserRating) ? clamp(toNumber(map.currentUserRating, 0), 0, 5) : state.playerRating;
    const rawCurrentUserLiked = hasValue(map?.currentUserLiked) ? Boolean(map.currentUserLiked) : Boolean(state.playerLiked);
    const crowdRating = rawRatingCount > 0 ? Number(rawAverageRating.toFixed(1)) : 0;

    const event = map?.event && typeof map.event === 'object'
      ? map.event
      : (mapData?.event && typeof mapData.event === 'object' ? mapData.event : null);
    const eventId = getEventId(event);

    return {
      ...map,
      mapId: map?.mapId || map?.id || this.getMapId(map),
      mapKey: map?.mapKey || this.resolveMapKey(map) || null,
      theme: pickFirstText(map?.theme, map?.mapTheme, mapData?.theme, mapData?.mapTheme, 'Unknown'),
      biome: pickFirstText(map?.biome, mapData?.biome, 'Unknown'),
      difficulty: pickFirstText(map?.difficulty, mapData?.difficulty, 'Unknown'),
      estimatedMinutes: Math.max(1, toNumber(
        pickFirstDefined(map?.estimatedMinutes, mapData?.estimatedMinutes, mapData?.estimatedDurationMinutes),
        10
      )),
      learningGoal: pickFirstText(map?.learningGoal, map?.description, mapData?.learningGoal, mapData?.description, 'No map description available.'),
      creatorName: pickFirstText(map?.creatorName, map?.submittedByContributorName, map?.authorName, mapData?.creatorName, 'admin'),
      creatorBadge: pickFirstText(map?.creatorBadge, mapData?.creatorBadge, 'Admin'),
      featured: Boolean(pickFirstDefined(map?.featured, state.featured, false)),
      seasonalTag: pickFirstText(map?.seasonalTag, mapData?.seasonalTag, 'Route'),
      recommendedTopic: pickFirstText(map?.recommendedTopic, map?.topicName, mapData?.recommendedTopic, mapData?.topicName, 'Unassigned'),
      unlockLevel,
      unlocked: isUnlocked,
      unlockText: isUnlocked ? 'Unlocked' : `Reach level ${unlockLevel} to access`,
      socialProof: {
        rating: crowdRating,
        ratingCount: rawRatingCount,
        likes: rawLikeCount,
        completions: state.completions,
        visits: state.visits,
        trendScore: state.trendScore,
        creatorRep: state.creatorRep,
        remixCount: state.remixCount,
        bonusStars: state.bonusStars
      },
      playerState: {
        liked: rawCurrentUserLiked,
        rating: rawCurrentUserRating,
        completions: state.playerCompletions,
        loreUnlocked: Boolean(state.unlockedLore),
        assistCharges: toNumber(state.assistCharges, 0),
        lastChoice: eventId ? state.choiceHistory?.[eventId] || null : null
      },
      event
    };
  }

  buildCatalog(rawMaps = [], learner) {
    return (Array.isArray(rawMaps) ? rawMaps : [])
      .map((map) => this.buildMapRecord(map, learner))
      .sort((a, b) => {
        if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
        if (a.unlocked !== b.unlocked) return Number(b.unlocked) - Number(a.unlocked);
        return b.socialProof.trendScore - a.socialProof.trendScore;
      });
  }

  getRecommendations(catalog = [], learner) {
    const level = this.getPlayerLevel(learner);
    const unlocked = catalog.filter((map) => map.unlocked);
    const nextLocked = catalog.find((map) => !map.unlocked);
    const trending = [...catalog].sort((a, b) => b.socialProof.trendScore - a.socialProof.trendScore)[0];
    const underrated = [...unlocked].sort((a, b) => a.socialProof.completions - b.socialProof.completions)[0];
    const unlockedCount = unlocked.length;
    const totalCount = catalog.length;
    const levelsToNextUnlock = nextLocked ? Math.max(0, nextLocked.unlockLevel - level) : 0;

    const progressionHeadline = totalCount === 0
      ? 'Your route feed will update once map data is available.'
      : (nextLocked && levelsToNextUnlock > 0
          ? `You have ${unlockedCount}/${totalCount} routes unlocked. ${nextLocked.name} opens at level ${nextLocked.unlockLevel}.`
          : `All ${totalCount} routes are unlocked. Keep momentum and sharpen mastery.`);

    return [
      progressionHeadline,
      trending ? `${trending.name} is trending with ${trending.socialProof.likes} likes.` : 'A new featured map will appear once catalog data loads.',
      nextLocked ? `Next unlock: ${nextLocked.name} at level ${nextLocked.unlockLevel}.` : 'All current gates are unlocked.',
      underrated ? `${underrated.name} is underplayed and worth a fresh run.` : 'Every unlocked gate is seeing healthy traffic.'
    ];
  }

  markMapVisited(map) {
    const state = this.ensureMapState(map);
    state.visits += 1;
    state.trendScore += 1;
    this.persist();
    return state;
  }

  toggleLike(map) {
    const state = this.ensureMapState(map);
    state.playerLiked = !state.playerLiked;
    state.likes += state.playerLiked ? 1 : -1;
    state.likes = Math.max(0, state.likes);
    state.trendScore += state.playerLiked ? 2 : -1;
    this.persist();
    return state.playerLiked;
  }

  rateMap(map, rating) {
    const state = this.ensureMapState(map);
    const nextRating = clamp(toNumber(rating, 0), 1, 5);
    if (!nextRating) return state.playerRating;

    const currentCount = Math.max(0, toNumber(state.ratingCount, 0));
    const crowdTotal = toNumber(state.rating, 0) * currentCount;
    const priorPlayer = clamp(toNumber(state.playerRating, 0), 0, 5);
    const baseCount = priorPlayer > 0 ? Math.max(1, currentCount - 1) : currentCount;
    const baseTotal = priorPlayer > 0 ? Math.max(0, crowdTotal - priorPlayer) : crowdTotal;
    const nextCount = baseCount + 1;

    state.playerRating = nextRating;
    state.ratingCount = nextCount;
    state.rating = Number(((baseTotal + nextRating) / nextCount).toFixed(2));
    state.trendScore += 1;
    this.persist();
    return state.playerRating;
  }

  recordChoice(map, eventId, option) {
    const state = this.ensureMapState(map);
    if (!eventId) return option?.rewards || {};
    if (!state.choiceHistory) state.choiceHistory = {};
    state.choiceHistory[eventId] = {
      optionId: option?.id || null,
      label: option?.label || '',
      selectedAt: new Date().toISOString()
    };

    const rewards = option?.rewards || {};
    state.trendScore += toNumber(rewards.bonusTrend, 0);
    state.bonusStars += toNumber(rewards.bonusStars, 0);
    state.creatorRep += toNumber(rewards.creatorBoost, 0) + toNumber(rewards.reputationDelta, 0);
    if (rewards.unlockLore) state.unlockedLore = true;
    if (rewards.encounterAssist) state.assistCharges = Math.max(1, toNumber(state.assistCharges, 0) + 1);
    this.persist();
    return rewards;
  }

  consumeAssist(map) {
    const state = this.ensureMapState(map);
    if (toNumber(state.assistCharges, 0) <= 0) return 0;
    state.assistCharges -= 1;
    this.persist();
    return state.assistCharges;
  }

  recordCompletion(map, payload = {}) {
    const state = this.ensureMapState(map);
    state.playerCompletions += 1;
    state.completions += 1;
    state.trendScore += 3;
    state.creatorRep += 2;
    state.bonusStars += toNumber(payload.bonusStars, 0);
    if (payload.featuredCompletion) state.featured = true;
    this.persist();
    return state;
  }

  getCreatorSpotlight(catalog = []) {
    return [...catalog]
      .sort((a, b) => b.socialProof.creatorRep - a.socialProof.creatorRep)
      .slice(0, 3);
  }
}

export const mapDiscoveryService = new MapDiscoveryService();
