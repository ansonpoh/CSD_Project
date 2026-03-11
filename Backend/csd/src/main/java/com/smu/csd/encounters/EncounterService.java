package com.smu.csd.encounters;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.smu.csd.leaderboard.LeaderboardService;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.monsters.Monster;
import com.smu.csd.monsters.MonsterService;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;
import com.smu.csd.roles.learner_progress.LearnerLessonProgress;
import com.smu.csd.roles.learner_progress.LearnerLessonProgressRepository;

@Service
public class EncounterService {
    private final NPCService npcService;
    private final MonsterService monsterService;
    private final LearnerRepository learnerRepository;
    private final LeaderboardService leaderboardService;
    private final MonsterProgressRepository monsterProgressRepository;
    private final LearnerLessonProgressRepository learnerLessonProgressRepository;
    private final MapRepository mapRepository;

    public EncounterService(
        NPCService npcService,
        MonsterService monsterService,
        LearnerRepository learnerRepository,
        LeaderboardService leaderboardService,
        MonsterProgressRepository monsterProgressRepository,
        LearnerLessonProgressRepository learnerLessonProgressRepository,
        MapRepository mapRepository
    ) {
        this.npcService = npcService;
        this.monsterService = monsterService;
        this.learnerRepository = learnerRepository;
        this.leaderboardService = leaderboardService;
        this.monsterProgressRepository = monsterProgressRepository;
        this.learnerLessonProgressRepository = learnerLessonProgressRepository;
        this.mapRepository = mapRepository;
    }

    public Map<String, Object> getEncounterState(UUID mapId, UUID supabaseUserId) {
        if (mapId == null) throw new IllegalArgumentException("mapId is required.");
        Learner learner = requireLearner(supabaseUserId);

        List<NPCMapLessonResponse> npcs = getMapNpcs(mapId);
        List<Monster> monsters = getMapMonsters(mapId);

        List<UUID> completedNpcIds = npcs.stream()
            .map(NPCMapLessonResponse::npcId)
            .filter(id -> id != null)
            .filter(npcId -> isNpcCompleted(learner.getLearnerId(), npcId))
            .distinct()
            .toList();

        int totalNpcs = (int) npcs.stream().map(NPCMapLessonResponse::npcId).filter(id -> id != null).distinct().count();
        int completedNpcCount = completedNpcIds.size();
        boolean allNpcsCompleted = totalNpcs > 0 && completedNpcCount >= totalNpcs;

        List<Map<String, Object>> monsterState = buildMonsterState(monsters, learner, mapId, allNpcsCompleted);

        Map<String, Object> npcSummary = new LinkedHashMap<>();
        npcSummary.put("total", totalNpcs);
        npcSummary.put("completed", completedNpcCount);
        npcSummary.put("completedNpcIds", completedNpcIds);
        npcSummary.put("allCompleted", allNpcsCompleted);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapId", mapId);
        response.put("npc", npcSummary);
        response.put("monsters", monsterState);
        return response;
    }

    public Map<String, Object> markNpcInteracted(UUID mapId, UUID npcId, UUID supabaseUserId) {
        if (mapId == null || npcId == null) {
            throw new IllegalArgumentException("mapId and npcId are required.");
        }

        Learner learner = requireLearner(supabaseUserId);
        boolean npcCompleted = isNpcCompleted(learner.getLearnerId(), npcId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapId", mapId);
        response.put("npcId", npcId);
        response.put("completed", npcCompleted);
        response.put(
            "message",
            npcCompleted
                ? "NPC lesson is completed."
                : "NPC completion is driven by lesson progress; complete the lesson to unlock monsters."
        );
        response.put("state", getEncounterState(mapId, supabaseUserId));
        return response;
    }

    public Map<String, Object> recordCombatResult(Map<String, Object> request, UUID supabaseUserId) {
        UUID mapId = parseUuid(request == null ? null : request.get("mapId"));
        UUID monsterId = parseUuid(request == null ? null : request.get("monsterId"));
        Boolean won = parseBoolean(request == null ? null : request.get("won"));

        if (mapId == null || monsterId == null) {
            throw new IllegalArgumentException("mapId and monsterId are required.");
        }

        Learner learner = requireLearner(supabaseUserId);
        ensureMonsterBelongsToMap(monsterId, mapId);

        boolean allNpcsCompleted = hasAllNpcsCompletedOnMap(learner.getLearnerId(), mapId);
        if (!allNpcsCompleted) {
            throw new IllegalStateException("Monsters unlock only after all NPC lessons are completed.");
        }

        MonsterProgress progress = getOrCreateMonsterProgress(learner, mapId, monsterId);
        boolean didWin = Boolean.TRUE.equals(won);

        progress.setAttempts(safeInt(progress.getAttempts()) + 1);
        progress.setWins(safeInt(progress.getWins()) + (didWin ? 1 : 0));
        progress.setLosses(safeInt(progress.getLosses()) + (didWin ? 0 : 1));
        progress.setLossStreak(didWin ? 0 : safeInt(progress.getLossStreak()) + 1);

        if (didWin) {
            progress.setMonsterDefeated(true);
            if (progress.getDefeatedAt() == null) progress.setDefeatedAt(LocalDateTime.now());
        }

        MonsterProgress saved = monsterProgressRepository.save(progress);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapId", mapId);
        response.put("monsterId", monsterId);
        response.put("won", didWin);
        response.put("attempts", safeInt(saved.getAttempts()));
        response.put("wins", safeInt(saved.getWins()));
        response.put("losses", safeInt(saved.getLosses()));
        response.put("lossStreak", safeInt(saved.getLossStreak()));
        response.put("monsterDefeated", Boolean.TRUE.equals(saved.getMonsterDefeated()));
        response.put("rewardClaimed", Boolean.TRUE.equals(saved.getRewardClaimed()));
        return response;
    }

    public Map<String, Object> claimReward(UUID mapId, UUID monsterId, UUID supabaseUserId) {
        if (mapId == null || monsterId == null) {
            throw new IllegalArgumentException("mapId and monsterId are required.");
        }

        Learner learner = requireLearner(supabaseUserId);
        ensureMonsterBelongsToMap(monsterId, mapId);

        MonsterProgress progress = getOrCreateMonsterProgress(learner, mapId, monsterId);
        if (!Boolean.TRUE.equals(progress.getMonsterDefeated())) {
            throw new IllegalStateException("Reward can only be claimed after defeating the monster.");
        }

        int xpAwarded = 0;
        if (!Boolean.TRUE.equals(progress.getRewardClaimed())) {
            xpAwarded = isBossMonster(mapId, monsterId) ? 140 : 90;
            int updatedXp = safeInt(learner.getTotal_xp()) + xpAwarded;
            int updatedLevel = (int) Math.floor(Math.sqrt(updatedXp / 100.0)) + 1;

            learner.setTotal_xp(updatedXp);
            learner.setLevel(updatedLevel);
            learner.setUpdated_at(LocalDateTime.now());
            learnerRepository.save(learner);
            leaderboardService.upsertLearnerScore(learner);

            progress.setRewardClaimed(true);
            if (progress.getRewardClaimedAt() == null) progress.setRewardClaimedAt(LocalDateTime.now());
            monsterProgressRepository.save(progress);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapId", mapId);
        response.put("monsterId", monsterId);
        response.put("xpAwarded", xpAwarded);
        response.put("learnerTotalXp", safeInt(learner.getTotal_xp()));
        response.put("learnerLevel", safeInt(learner.getLevel()));
        response.put("rewardClaimed", true);
        return response;
    }

    public Map<String, Object> getTelemetryDashboard(UUID mapId) {
        List<MonsterProgress> rows = monsterProgressRepository.findAll();
        if (mapId != null) {
            rows = rows.stream().filter(r -> r.getMap() != null && mapId.equals(r.getMap().getMapId())).toList();
        }

        long combatStarted = rows.stream().filter(r -> safeInt(r.getAttempts()) > 0).count();
        long combatWon = rows.stream().filter(r -> safeInt(r.getWins()) > 0).count();
        long combatLost = rows.stream().filter(r -> safeInt(r.getLosses()) > 0).count();
        long rewardClaimed = rows.stream().filter(r -> Boolean.TRUE.equals(r.getRewardClaimed())).count();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mapId", mapId);
        response.put("combatStarted", combatStarted);
        response.put("combatWon", combatWon);
        response.put("combatLost", combatLost);
        response.put("rewardClaimed", rewardClaimed);
        response.put("winRate", toPercent(combatWon, combatStarted));
        response.put("lossRate", toPercent(combatLost, combatStarted));
        return response;
    }

    private List<Map<String, Object>> buildMonsterState(
        List<Monster> monsters,
        Learner learner,
        UUID mapId,
        boolean allNpcsCompleted
    ) {
        List<Monster> ordered = new ArrayList<>(monsters);
        ordered.sort(Comparator.comparing(monster -> asString(monster.getMonsterId())));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            Monster monster = ordered.get(i);
            if (monster == null || monster.getMonsterId() == null) continue;

            MonsterProgress progress = monsterProgressRepository
                .findByLearnerLearnerIdAndMapMapIdAndMonsterMonsterId(learner.getLearnerId(), mapId, monster.getMonsterId())
                .orElse(null);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("monsterId", monster.getMonsterId());
            row.put("name", monster.getName());
            row.put("boss", i == ordered.size() - 1);
            row.put("unlocked", allNpcsCompleted);
            row.put("monsterDefeated", progress != null && Boolean.TRUE.equals(progress.getMonsterDefeated()));
            row.put("rewardClaimed", progress != null && Boolean.TRUE.equals(progress.getRewardClaimed()));
            row.put("attempts", progress == null ? 0 : safeInt(progress.getAttempts()));
            row.put("wins", progress == null ? 0 : safeInt(progress.getWins()));
            row.put("losses", progress == null ? 0 : safeInt(progress.getLosses()));
            row.put("lossStreak", progress == null ? 0 : safeInt(progress.getLossStreak()));
            rows.add(row);
        }

        return rows;
    }

    private List<NPCMapLessonResponse> getMapNpcs(UUID mapId) {
        return npcService.getNPCsByMapId(mapId).stream()
            .filter(npc -> npc != null && npc.npcId() != null)
            .toList();
    }

    private List<Monster> getMapMonsters(UUID mapId) {
        return monsterService.getMonstersByMapId(mapId).stream()
            .filter(monster -> monster != null && monster.getMonsterId() != null)
            .toList();
    }

    private boolean hasAllNpcsCompletedOnMap(UUID learnerId, UUID mapId) {
        List<UUID> npcIds = getMapNpcs(mapId).stream().map(NPCMapLessonResponse::npcId).distinct().toList();
        if (npcIds.isEmpty()) return false;

        long completed = learnerLessonProgressRepository.countByLearnerLearnerIdAndNpcIdInAndStatus(
            learnerId,
            npcIds,
            LearnerLessonProgress.Status.COMPLETED
        );
        return completed >= npcIds.size();
    }

    private boolean isNpcCompleted(UUID learnerId, UUID npcId) {
        return learnerLessonProgressRepository.existsByLearnerLearnerIdAndNpcIdAndStatus(
            learnerId,
            npcId,
            LearnerLessonProgress.Status.COMPLETED
        );
    }

    private boolean isBossMonster(UUID mapId, UUID monsterId) {
        List<Monster> monsters = new ArrayList<>(getMapMonsters(mapId));
        monsters.sort(Comparator.comparing(monster -> asString(monster.getMonsterId())));
        if (monsters.isEmpty()) return false;
        UUID lastMonsterId = monsters.get(monsters.size() - 1).getMonsterId();
        return monsterId.equals(lastMonsterId);
    }

    private void ensureMonsterBelongsToMap(UUID monsterId, UUID mapId) {
        boolean exists = getMapMonsters(mapId).stream()
            .anyMatch(monster -> monsterId.equals(monster.getMonsterId()));
        if (!exists) throw new IllegalArgumentException("Monster does not belong to map.");
    }

    private MonsterProgress getOrCreateMonsterProgress(Learner learner, UUID mapId, UUID monsterId) {
        MonsterProgress existing = monsterProgressRepository
            .findByLearnerLearnerIdAndMapMapIdAndMonsterMonsterId(learner.getLearnerId(), mapId, monsterId)
            .orElse(null);
        if (existing != null) return existing;

        Monster monster = monsterService.getMonsterById(monsterId);
        com.smu.csd.maps.Map map = mapRepository.findById(mapId)
            .orElseThrow(() -> new IllegalArgumentException("Map not found."));

        return MonsterProgress.builder()
            .learner(learner)
            .map(map)
            .monster(monster)
            .attempts(0)
            .wins(0)
            .losses(0)
            .lossStreak(0)
            .monsterDefeated(false)
            .rewardClaimed(false)
            .createdAt(LocalDateTime.now())
            .build();
    }

    private Learner requireLearner(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) throw new IllegalArgumentException("Learner profile not found for current user.");
        return learner;
    }

    private UUID parseUuid(Object value) {
        if (value == null) return null;
        try {
            return UUID.fromString(String.valueOf(value));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private Boolean parseBoolean(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private String asString(UUID value) {
        return value == null ? "" : value.toString();
    }

    private double toPercent(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        double pct = (numerator * 100.0) / denominator;
        return Math.round(pct * 100.0) / 100.0;
    }
}
