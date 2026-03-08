const STORAGE_KEY = 'mapDiscoveryState';

const DEFAULT_THEMES = [
  {
    key: 'map1',
    theme: 'Whispering Canopy',
    biome: 'Forest',
    difficulty: 'Novice',
    estimatedMinutes: 8,
    learningGoal: 'Master the basics through low-pressure encounters.',
    creatorName: 'Studio Archive',
    creatorBadge: 'Curated',
    featured: true,
    seasonalTag: 'Starter Route',
    unlockLevel: 1,
    recommendedTopic: 'Foundations',
    event: {
      id: 'forest_oracle',
      title: 'Whisperleaf Oracle',
      intro: 'An ancient tree offers a bargain before the first encounter.',
      options: [
        {
          id: 'wisdom',
          label: 'Seek wisdom',
          summary: '+25 XP and a stronger lesson focus',
          outcome: 'The oracle blesses your study path. Lessons on this map feel sharper and more rewarding.',
          rewards: { bonusXp: 25, reputationDelta: 1, lessonBoost: true }
        },
        {
          id: 'speed',
          label: 'Take the shortcut',
          summary: 'Spawn the next monster immediately',
          outcome: 'A hidden route opens. The next threat reveals itself early, saving time but raising tension.',
          rewards: { revealNextMonster: true, reputationDelta: 2 }
        },
        {
          id: 'respect',
          label: 'Leave an offering',
          summary: '+1 map star and creator support',
          outcome: 'The grove records your tribute and marks you as a respectful explorer.',
          rewards: { bonusStars: 1, creatorBoost: 1 }
        }
      ]
    }
  },
  {
    key: 'map2',
    theme: 'Echoing Hollow',
    biome: 'Cavern',
    difficulty: 'Skilled',
    estimatedMinutes: 12,
    learningGoal: 'Test retention under pressure with harder quiz encounters.',
    creatorName: 'Depth Cartographer Ivo',
    creatorBadge: 'Community Pick',
    featured: false,
    seasonalTag: 'Challenge Run',
    unlockLevel: 2,
    recommendedTopic: 'Recall',
    event: {
      id: 'cave_echo',
      title: 'Echo Chamber',
      intro: 'The cavern repeats your choices back to you. You can shape the run before the monsters notice.',
      options: [
        {
          id: 'focus',
          label: 'Steady your mind',
          summary: 'Reduce pressure on the next fight',
          outcome: 'The echo settles. Your next battle feels more controlled.',
          rewards: { bonusXp: 20, encounterAssist: true, reputationDelta: 1 }
        },
        {
          id: 'broadcast',
          label: 'Broadcast your challenge',
          summary: '+trend score, tougher run',
          outcome: 'The cave amplifies your presence. The map becomes hotter, and your name travels further.',
          rewards: { bonusTrend: 3, riskFlag: true, reputationDelta: 3 }
        },
        {
          id: 'survey',
          label: 'Survey hidden marks',
          summary: 'Unlock creator notes',
          outcome: 'You find traces left by earlier explorers and learn how the cave was designed.',
          rewards: { unlockLore: true, bonusStars: 1 }
        }
      ]
    }
  },
  {
    key: 'map3',
    theme: 'Summit of Trials',
    biome: 'Mountain',
    difficulty: 'Expert',
    estimatedMinutes: 16,
    learningGoal: 'Push full mastery with boss-level encounter requirements.',
    creatorName: 'Highpeak Council',
    creatorBadge: 'Verified',
    featured: true,
    seasonalTag: 'Boss Path',
    unlockLevel: 4,
    recommendedTopic: 'Mastery',
    event: {
      id: 'summit_signal',
      title: 'Signal Fire',
      intro: 'A dormant beacon can change how this summit run unfolds.',
      options: [
        {
          id: 'ignite',
          label: 'Ignite the beacon',
          summary: '+40 XP and featured completion flair',
          outcome: 'The summit glows across the world map. This run will be remembered.',
          rewards: { bonusXp: 40, featuredCompletion: true, reputationDelta: 4 }
        },
        {
          id: 'hide',
          label: 'Keep a low profile',
          summary: 'Safer run with fewer spotlight bonuses',
          outcome: 'You move quietly through the ascent, trading fame for steadiness.',
          rewards: { encounterAssist: true, bonusXp: 10, reputationDelta: 1 }
        },
        {
          id: 'chart',
          label: 'Chart a new route',
          summary: '+2 stars and remix energy',
          outcome: 'The summit route shifts. Future explorers will notice the path you opened.',
          rewards: { bonusStars: 2, creatorBoost: 2, bonusTrend: 2 }
        }
      ]
    }
  },
  {
    key: 'map4',
    theme: 'Garden of Makers',
    biome: 'Settlement',
    difficulty: 'Adaptive',
    estimatedMinutes: 10,
    learningGoal: 'Experiment with creator-authored encounters and map remix ideas.',
    creatorName: 'Prototype Guild',
    creatorBadge: 'Lab',
    featured: false,
    seasonalTag: 'Remix Lab',
    unlockLevel: 2,
    recommendedTopic: 'Creation',
    event: {
      id: 'maker_compass',
      title: 'Maker Compass',
      intro: 'A brass compass points toward what this map wants to become.',
      options: [
        {
          id: 'community',
          label: 'Follow the crowd',
          summary: 'Boost popularity and likes',
          outcome: 'You align with the most traveled route and lift the map higher in discovery.',
          rewards: { bonusLikes: 2, bonusTrend: 2, reputationDelta: 2 }
        },
        {
          id: 'experiment',
          label: 'Try the unstable path',
          summary: '+30 XP and remix score',
          outcome: 'The compass spins wildly, then locks onto a risky shortcut packed with lessons.',
          rewards: { bonusXp: 30, creatorBoost: 2, bonusStars: 1 }
        },
        {
          id: 'document',
          label: 'Document the route',
          summary: 'Unlock more map intel',
          outcome: 'You leave detailed notes behind. Future recommendations become more precise.',
          rewards: { unlockLore: true, bonusTrend: 1, reputationDelta: 1 }
        }
      ]
    }
  }
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (error) {
    console.error('Failed to load map discovery state:', error);
    return {};
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save map discovery state:', error);
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
    if (raw === 'map1' || raw.includes('forest')) return 'map1';
    if (raw === 'map2' || raw.includes('cave')) return 'map2';
    if (raw === 'map3' || raw.includes('mountain')) return 'map3';
    if (raw === 'map4' || raw.includes('test') || raw.includes('garden') || raw.includes('terrain')) return 'map4';
    return 'map1';
  }

  getThemeDefaults(map) {
    const key = this.resolveMapKey(map);
    return DEFAULT_THEMES.find((entry) => entry.key === key) || DEFAULT_THEMES[0];
  }

  ensureMapState(map) {
    const id = this.getMapId(map);
    if (!this.state[id]) {
      const defaults = this.getThemeDefaults(map);
      const seed = id.length + defaults.unlockLevel * 13;
      this.state[id] = {
        rating: clamp(4 + (seed % 7) * 0.08, 3.8, 4.8),
        ratingCount: 18 + seed * 3,
        likes: 40 + seed * 5,
        completions: 90 + seed * 7,
        visits: 0,
        featured: Boolean(defaults.featured),
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
    return toNumber(learner?.level, 1);
  }

  buildMapRecord(map, learner) {
    const defaults = this.getThemeDefaults(map);
    const state = this.ensureMapState(map);
    const unlockLevel = defaults.unlockLevel || 1;
    const playerLevel = this.getPlayerLevel(learner);
    const isUnlocked = playerLevel >= unlockLevel || state.playerCompletions > 0;
    const crowdRating = state.ratingCount > 0 ? Number(state.rating.toFixed(1)) : 0;

    return {
      ...map,
      mapId: map?.mapId || map?.id || this.getMapId(map),
      mapKey: map?.mapKey || this.resolveMapKey(map),
      theme: defaults.theme,
      biome: defaults.biome,
      difficulty: defaults.difficulty,
      estimatedMinutes: defaults.estimatedMinutes,
      learningGoal: defaults.learningGoal,
      creatorName: defaults.creatorName,
      creatorBadge: defaults.creatorBadge,
      featured: Boolean(defaults.featured || state.featured),
      seasonalTag: defaults.seasonalTag,
      recommendedTopic: defaults.recommendedTopic,
      unlockLevel,
      unlocked: isUnlocked,
      unlockText: isUnlocked ? 'Unlocked' : `Reach level ${unlockLevel} to access`,
      socialProof: {
        rating: crowdRating,
        ratingCount: state.ratingCount,
        likes: state.likes,
        completions: state.completions,
        visits: state.visits,
        trendScore: state.trendScore,
        creatorRep: state.creatorRep,
        remixCount: state.remixCount,
        bonusStars: state.bonusStars
      },
      playerState: {
        liked: Boolean(state.playerLiked),
        rating: state.playerRating,
        completions: state.playerCompletions,
        loreUnlocked: Boolean(state.unlockedLore),
        assistCharges: toNumber(state.assistCharges, 0),
        lastChoice: state.choiceHistory?.[defaults.event?.id] || null
      },
      event: defaults.event
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

    return [
      level < 3
        ? 'Start with lower-difficulty gates and build fast completions.'
        : 'Push a harder route to accelerate mastery and unlock richer events.',
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
    if (!state.choiceHistory) state.choiceHistory = {};
    state.choiceHistory[eventId] = {
      optionId: option?.id || null,
      label: option?.label || '',
      selectedAt: new Date().toISOString()
    };

    const rewards = option?.rewards || {};
    state.trendScore += toNumber(rewards.bonusTrend, 0);
    state.likes += toNumber(rewards.bonusLikes, 0);
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
    if (payload.autoLike && !state.playerLiked) {
      state.playerLiked = true;
      state.likes += 1;
    }
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
