package com.smu.csd.encounters;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.monsters.Monster;
import com.smu.csd.monsters.MonsterService;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;

@Service
public class EncounterService {
    private static final String PAIR_KEY_PREFIX = "encounter:pairs:";
    private static final String PROGRESS_KEY_PREFIX = "encounter:progress:";
    private static final String PROGRESS_INDEX_PREFIX = "encounter:progress:index:";
    private static final String TELEMETRY_GLOBAL_KEY = "telemetry:funnel:global";
    private static final String TELEMETRY_MAP_PREFIX = "telemetry:funnel:map:";

    private static final String FIELD_NPC_INTERACTED = "npc_interacted";
    private static final String FIELD_MONSTER_UNLOCKED = "monster_unlocked";
    private static final String FIELD_MONSTER_DEFEATED = "monster_defeated";
    private static final String FIELD_REWARD_CLAIMED = "reward_claimed";
    private static final String FIELD_ATTEMPTS = "attempts";
    private static final String FIELD_WINS = "wins";
    private static final String FIELD_LOSSES = "losses";
    private static final String FIELD_LOSS_STREAK = "loss_streak";
    private static final String FIELD_MONSTER_ID = "monster_id";

    private final StringRedisTemplate redisTemplate;
    private final NPCService npcService;
    private final MonsterService monsterService;
    private final LearnerRepository learnerRepository;
    private final LeaderboardService leaderboardService;

    public EncounterService(
        StringRedisTemplate redisTemplate,
        NPCService npcService,
        MonsterService monsterService,
        LearnerRepository learnerRepository,
        LeaderboardService leaderboardService
    ) {
        this.redisTemplate = redisTemplate;
        this.npcService = npcService;
        this.monsterService = monsterService;
        this.learnerRepository = learnerRepository;
        this.leaderboardService = leaderboardService;
    }

    public EncounterStateResponse getEncounterState(UUID mapId, UUID supabaseUserId) {
        if (mapId == null) throw new IllegalArgumentException("mapId is required.");
        Learner learner = requireLearner(supabaseUserId);

        List<EncounterPairResponse> pairs = getPairs(mapId);
        List<EncounterProgressResponse> progress = pairs.stream()
            .map(pair -> readProgress(learner.getLearnerId(), mapId, pair.npcId(), pair.monsterId()))
            .toList();

        incrementTelemetry(mapId, "map_entered");

        return new EncounterStateResponse(
            mapId,
            pairs,
            progress,
            getTelemetryDashboard(mapId)
        );
    }

    public List<EncounterPairResponse> getPairs(UUID mapId) {
        if (mapId == null) throw new IllegalArgumentException("mapId is required.");

        List<NPCMapLessonResponse> npcs = npcService.getNPCsByMapId(mapId);
        List<Monster> monsters = monsterService.getMonstersByMapId(mapId);
        Map<UUID, Monster> monsterLookup = new HashMap<>();
        monsters.forEach(monster -> monsterLookup.put(monster.getMonster_id(), monster));

        Map<Object, Object> overrides = redisTemplate.opsForHash().entries(pairKey(mapId));
        List<EncounterPairResponse> pairs = new ArrayList<>();

        for (int i = 0; i < npcs.size(); i++) {
            NPCMapLessonResponse npc = npcs.get(i);
            if (npc == null || npc.npcId() == null) continue;

            UUID overrideMonsterId = parseUUID(overrides.get(npc.npcId().toString()));
            Monster chosenMonster = overrideMonsterId != null
                ? monsterLookup.get(overrideMonsterId)
                : (i < monsters.size() ? monsters.get(i) : null);

            if (chosenMonster == null) continue;

            pairs.add(new EncounterPairResponse(
                npc.npcId(),
                npc.name(),
                chosenMonster.getMonster_id(),
                chosenMonster.getName(),
                false,
                i
            ));
        }

        if (!pairs.isEmpty()) {
            EncounterPairResponse last = pairs.get(pairs.size() - 1);
            pairs.set(pairs.size() - 1, new EncounterPairResponse(
                last.npcId(),
                last.npcName(),
                last.monsterId(),
                last.monsterName(),
                true,
                last.encounterOrder()
            ));
        }

        return pairs;
    }

    public EncounterPairResponse assignPair(UUID mapId, UUID npcId, UUID monsterId) {
        if (mapId == null || npcId == null || monsterId == null) {
            throw new IllegalArgumentException("mapId, npcId and monsterId are required.");
        }

        boolean npcExists = npcService.getNPCsByMapId(mapId).stream()
            .anyMatch(npc -> npcId.equals(npc.npcId()));
        boolean monsterExists = monsterService.getMonstersByMapId(mapId).stream()
            .anyMatch(monster -> monsterId.equals(monster.getMonster_id()));

        if (!npcExists) throw new IllegalArgumentException("NPC does not belong to this map.");
        if (!monsterExists) throw new IllegalArgumentException("Monster does not belong to this map.");

        redisTemplate.opsForHash().put(pairKey(mapId), npcId.toString(), monsterId.toString());
        return getPairs(mapId).stream()
            .filter(pair -> npcId.equals(pair.npcId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Failed to resolve assigned pair."));
    }

    public EncounterProgressResponse markNpcInteracted(UUID mapId, UUID npcId, UUID supabaseUserId) {
        Learner learner = requireLearner(supabaseUserId);
        EncounterPairResponse pair = requirePair(mapId, npcId, null);
        EncounterProgressResponse current = readProgress(learner.getLearnerId(), mapId, pair.npcId(), pair.monsterId());

        EncounterProgressResponse updated = new EncounterProgressResponse(
            current.npcId(),
            current.monsterId(),
            true,
            true,
            current.monsterDefeated(),
            current.rewardClaimed(),
            current.attempts(),
            current.wins(),
            current.losses(),
            current.lossStreak()
        );
        saveProgress(learner.getLearnerId(), mapId, updated);

        if (!current.npcInteracted()) incrementTelemetry(mapId, "npc_interacted");
        if (!current.monsterUnlocked()) incrementTelemetry(mapId, "monster_unlocked");

        return updated;
    }

    public EncounterProgressResponse recordCombatResult(EncounterCombatResultRequest request, UUID supabaseUserId) {
        if (request == null || request.mapId() == null) {
            throw new IllegalArgumentException("mapId is required for combat result.");
        }
        Learner learner = requireLearner(supabaseUserId);
        boolean won = Boolean.TRUE.equals(request.won());
        EncounterPairResponse pair = requirePair(request.mapId(), request.npcId(), request.monsterId());
        EncounterProgressResponse current = readProgress(
            learner.getLearnerId(),
            request.mapId(),
            pair.npcId(),
            pair.monsterId()
        );

        int attempts = current.attempts() + 1;
        int wins = current.wins() + (won ? 1 : 0);
        int losses = current.losses() + (won ? 0 : 1);
        int lossStreak = won ? 0 : current.lossStreak() + 1;

        EncounterProgressResponse updated = new EncounterProgressResponse(
            current.npcId(),
            current.monsterId(),
            true,
            true,
            won,
            won ? current.rewardClaimed() : false,
            attempts,
            wins,
            losses,
            lossStreak
        );
        saveProgress(learner.getLearnerId(), request.mapId(), updated);

        incrementTelemetry(request.mapId(), "combat_started");
        incrementTelemetry(request.mapId(), won ? "combat_won" : "combat_lost");
        return updated;
    }

    public EncounterRewardClaimResponse claimReward(UUID mapId, UUID monsterId, UUID supabaseUserId) {
        Learner learner = requireLearner(supabaseUserId);
        EncounterPairResponse pair = requirePair(mapId, null, monsterId);
        EncounterProgressResponse current = readProgress(
            learner.getLearnerId(),
            mapId,
            pair.npcId(),
            pair.monsterId()
        );

        if (!current.monsterDefeated()) {
            throw new IllegalStateException("Reward can only be claimed after defeating the monster.");
        }

        if (current.rewardClaimed()) {
            return new EncounterRewardClaimResponse(
                0,
                safeInt(learner.getTotal_xp()),
                safeInt(learner.getLevel()),
                current
            );
        }

        int xpAwarded = pair.bossEncounter() ? 140 : 90;
        int updatedXp = safeInt(learner.getTotal_xp()) + xpAwarded;
        int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;

        learner.setTotal_xp(updatedXp);
        learner.setLevel(updatedLevel);
        learner.setUpdated_at(LocalDateTime.now());
        learnerRepository.save(learner);
        leaderboardService.upsertLearnerScore(learner);

        EncounterProgressResponse updated = new EncounterProgressResponse(
            current.npcId(),
            current.monsterId(),
            current.npcInteracted(),
            current.monsterUnlocked(),
            current.monsterDefeated(),
            true,
            current.attempts(),
            current.wins(),
            current.losses(),
            current.lossStreak()
        );
        saveProgress(learner.getLearnerId(), mapId, updated);
        incrementTelemetry(mapId, "reward_claimed");

        return new EncounterRewardClaimResponse(xpAwarded, updatedXp, updatedLevel, updated);
    }

    public EncounterRetryProfile getRetryProfile(UUID mapId, UUID monsterId, UUID supabaseUserId) {
        if (mapId == null || monsterId == null || supabaseUserId == null) {
            return new EncounterRetryProfile(0, 0, 100);
        }
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) return new EncounterRetryProfile(0, 0, 100);

        EncounterPairResponse pair = requirePair(mapId, null, monsterId);
        EncounterProgressResponse progress = readProgress(
            learner.getLearnerId(),
            mapId,
            pair.npcId(),
            pair.monsterId()
        );

        int lossStreak = Math.max(0, progress.lossStreak());
        int questionReduction = Math.min(3, lossStreak);
        int hpPercent;
        if (questionReduction <= 0) hpPercent = 100;
        else if (questionReduction == 1) hpPercent = 85;
        else if (questionReduction == 2) hpPercent = 72;
        else hpPercent = 60;

        return new EncounterRetryProfile(lossStreak, questionReduction, hpPercent);
    }

    public EncounterTelemetryDashboardResponse getTelemetryDashboard(UUID mapId) {
        String key = mapId == null ? TELEMETRY_GLOBAL_KEY : telemetryMapKey(mapId);
        Map<Object, Object> raw = redisTemplate.opsForHash().entries(key);

        long mapEntered = readLong(raw, "map_entered");
        long npcInteracted = readLong(raw, "npc_interacted");
        long monsterUnlocked = readLong(raw, "monster_unlocked");
        long combatStarted = readLong(raw, "combat_started");
        long combatWon = readLong(raw, "combat_won");
        long combatLost = readLong(raw, "combat_lost");
        long rewardClaimed = readLong(raw, "reward_claimed");

        return new EncounterTelemetryDashboardResponse(
            mapEntered,
            npcInteracted,
            monsterUnlocked,
            combatStarted,
            combatWon,
            combatLost,
            rewardClaimed,
            toPercent(npcInteracted, mapEntered),
            toPercent(monsterUnlocked, npcInteracted),
            toPercent(combatWon, combatStarted),
            toPercent(combatLost, combatStarted),
            toPercent(rewardClaimed, combatWon)
        );
    }

    private EncounterPairResponse requirePair(UUID mapId, UUID npcId, UUID monsterId) {
        return getPairs(mapId).stream()
            .filter(pair -> (npcId != null && npcId.equals(pair.npcId()))
                || (monsterId != null && monsterId.equals(pair.monsterId())))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("No encounter pair found for this map."));
    }

    private EncounterProgressResponse readProgress(UUID learnerId, UUID mapId, UUID npcId, UUID fallbackMonsterId) {
        String key = progressKey(learnerId, mapId, npcId);
        Map<Object, Object> values = redisTemplate.opsForHash().entries(key);
        if (values == null || values.isEmpty()) {
            return new EncounterProgressResponse(
                npcId,
                fallbackMonsterId,
                false,
                false,
                false,
                false,
                0,
                0,
                0,
                0
            );
        }

        UUID monsterId = parseUUID(values.get(FIELD_MONSTER_ID));
        if (monsterId == null) monsterId = fallbackMonsterId;

        return new EncounterProgressResponse(
            npcId,
            monsterId,
            readBoolean(values, FIELD_NPC_INTERACTED),
            readBoolean(values, FIELD_MONSTER_UNLOCKED),
            readBoolean(values, FIELD_MONSTER_DEFEATED),
            readBoolean(values, FIELD_REWARD_CLAIMED),
            readInt(values, FIELD_ATTEMPTS),
            readInt(values, FIELD_WINS),
            readInt(values, FIELD_LOSSES),
            readInt(values, FIELD_LOSS_STREAK)
        );
    }

    private void saveProgress(UUID learnerId, UUID mapId, EncounterProgressResponse progress) {
        String key = progressKey(learnerId, mapId, progress.npcId());
        redisTemplate.opsForHash().put(key, FIELD_MONSTER_ID, asString(progress.monsterId()));
        redisTemplate.opsForHash().put(key, FIELD_NPC_INTERACTED, String.valueOf(progress.npcInteracted()));
        redisTemplate.opsForHash().put(key, FIELD_MONSTER_UNLOCKED, String.valueOf(progress.monsterUnlocked()));
        redisTemplate.opsForHash().put(key, FIELD_MONSTER_DEFEATED, String.valueOf(progress.monsterDefeated()));
        redisTemplate.opsForHash().put(key, FIELD_REWARD_CLAIMED, String.valueOf(progress.rewardClaimed()));
        redisTemplate.opsForHash().put(key, FIELD_ATTEMPTS, String.valueOf(progress.attempts()));
        redisTemplate.opsForHash().put(key, FIELD_WINS, String.valueOf(progress.wins()));
        redisTemplate.opsForHash().put(key, FIELD_LOSSES, String.valueOf(progress.losses()));
        redisTemplate.opsForHash().put(key, FIELD_LOSS_STREAK, String.valueOf(progress.lossStreak()));
        redisTemplate.opsForSet().add(progressIndexKey(learnerId, mapId), progress.npcId().toString());
    }

    private void incrementTelemetry(UUID mapId, String field) {
        redisTemplate.opsForHash().increment(TELEMETRY_GLOBAL_KEY, field, 1);
        if (mapId != null) {
            redisTemplate.opsForHash().increment(telemetryMapKey(mapId), field, 1);
        }
    }

    private String pairKey(UUID mapId) {
        return PAIR_KEY_PREFIX + mapId;
    }

    private String progressKey(UUID learnerId, UUID mapId, UUID npcId) {
        return PROGRESS_KEY_PREFIX + learnerId + ":" + mapId + ":" + npcId;
    }

    private String progressIndexKey(UUID learnerId, UUID mapId) {
        return PROGRESS_INDEX_PREFIX + learnerId + ":" + mapId;
    }

    private String telemetryMapKey(UUID mapId) {
        return TELEMETRY_MAP_PREFIX + mapId;
    }

    private Learner requireLearner(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) throw new IllegalArgumentException("Learner profile not found for current user.");
        return learner;
    }

    private boolean readBoolean(Map<Object, Object> values, String field) {
        Object raw = values.get(field);
        return raw != null && Boolean.parseBoolean(raw.toString());
    }

    private int readInt(Map<Object, Object> values, String field) {
        Object raw = values.get(field);
        if (raw == null) return 0;
        try {
            return Integer.parseInt(raw.toString());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private long readLong(Map<Object, Object> values, String field) {
        Object raw = values.get(field);
        if (raw == null) return 0L;
        try {
            return Long.parseLong(raw.toString());
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private UUID parseUUID(Object raw) {
        if (raw == null) return null;
        try {
            return UUID.fromString(raw.toString());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String asString(UUID value) {
        return value == null ? "" : value.toString();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double toPercent(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        double pct = (numerator * 100.0) / denominator;
        return Math.round(pct * 100.0) / 100.0;
    }
}
