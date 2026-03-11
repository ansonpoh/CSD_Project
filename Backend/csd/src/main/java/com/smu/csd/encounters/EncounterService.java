package com.smu.csd.encounters;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.smu.csd.encounters.dtos.EncounterClaimRewardResponseDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultRequestDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultResponseDto;
import com.smu.csd.encounters.dtos.EncounterNpcInteractResponseDto;
import com.smu.csd.encounters.dtos.EncounterStateDto;
import com.smu.csd.encounters.dtos.EncounterTelemetryDashboardDto;
import com.smu.csd.encounters.dtos.MonsterStateDto;
import com.smu.csd.encounters.dtos.NpcSummaryDto;
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

    public EncounterStateDto getEncounterState(UUID mapId, UUID supabaseUserId) {
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

        List<MonsterStateDto> monsterState = buildMonsterState(monsters, learner, mapId, allNpcsCompleted);
        NpcSummaryDto npcSummary = new NpcSummaryDto(totalNpcs, completedNpcCount, completedNpcIds, allNpcsCompleted);

        return new EncounterStateDto(mapId, npcSummary, monsterState);
    }

    public EncounterNpcInteractResponseDto markNpcInteracted(UUID mapId, UUID npcId, UUID supabaseUserId) {
        if (mapId == null || npcId == null) {
            throw new IllegalArgumentException("mapId and npcId are required.");
        }

        Learner learner = requireLearner(supabaseUserId);
        boolean npcCompleted = isNpcCompleted(learner.getLearnerId(), npcId);
        String message = npcCompleted
            ? "NPC lesson is completed."
            : "NPC completion is driven by lesson progress; complete the lesson to unlock monsters.";

        return new EncounterNpcInteractResponseDto(
            mapId,
            npcId,
            npcCompleted,
            message,
            getEncounterState(mapId, supabaseUserId)
        );
    }

    public EncounterCombatResultResponseDto recordCombatResult(
        EncounterCombatResultRequestDto request,
        UUID supabaseUserId
    ) {
        UUID mapId = request == null ? null : request.mapId();
        UUID monsterId = request == null ? null : request.monsterId();
        Boolean won = request == null ? null : request.won();

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

        return new EncounterCombatResultResponseDto(
            mapId,
            monsterId,
            didWin,
            safeInt(saved.getAttempts()),
            safeInt(saved.getWins()),
            safeInt(saved.getLosses()),
            safeInt(saved.getLossStreak()),
            Boolean.TRUE.equals(saved.getMonsterDefeated()),
            Boolean.TRUE.equals(saved.getRewardClaimed())
        );
    }

    public EncounterClaimRewardResponseDto claimReward(UUID mapId, UUID monsterId, UUID supabaseUserId) {
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

        return new EncounterClaimRewardResponseDto(
            mapId,
            monsterId,
            xpAwarded,
            safeInt(learner.getTotal_xp()),
            safeInt(learner.getLevel()),
            true
        );
    }

    public EncounterTelemetryDashboardDto getTelemetryDashboard(UUID mapId) {
        List<MonsterProgress> rows = monsterProgressRepository.findAll();
        if (mapId != null) {
            rows = rows.stream().filter(r -> r.getMap() != null && mapId.equals(r.getMap().getMapId())).toList();
        }

        long combatStarted = rows.stream().filter(r -> safeInt(r.getAttempts()) > 0).count();
        long combatWon = rows.stream().filter(r -> safeInt(r.getWins()) > 0).count();
        long combatLost = rows.stream().filter(r -> safeInt(r.getLosses()) > 0).count();
        long rewardClaimed = rows.stream().filter(r -> Boolean.TRUE.equals(r.getRewardClaimed())).count();

        return new EncounterTelemetryDashboardDto(
            mapId,
            combatStarted,
            combatWon,
            combatLost,
            rewardClaimed,
            toPercent(combatWon, combatStarted),
            toPercent(combatLost, combatStarted)
        );
    }

    private List<MonsterStateDto> buildMonsterState(
        List<Monster> monsters,
        Learner learner,
        UUID mapId,
        boolean allNpcsCompleted
    ) {
        List<Monster> ordered = new ArrayList<>(monsters);
        ordered.sort(Comparator.comparing(monster -> asString(monster.getMonsterId())));

        List<MonsterStateDto> rows = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            Monster monster = ordered.get(i);
            if (monster == null || monster.getMonsterId() == null) continue;

            MonsterProgress progress = monsterProgressRepository
                .findByLearnerLearnerIdAndMapMapIdAndMonsterMonsterId(learner.getLearnerId(), mapId, monster.getMonsterId())
                .orElse(null);

            rows.add(new MonsterStateDto(
                monster.getMonsterId(),
                monster.getName(),
                i == ordered.size() - 1,
                allNpcsCompleted,
                progress != null && Boolean.TRUE.equals(progress.getMonsterDefeated()),
                progress != null && Boolean.TRUE.equals(progress.getRewardClaimed()),
                progress == null ? 0 : safeInt(progress.getAttempts()),
                progress == null ? 0 : safeInt(progress.getWins()),
                progress == null ? 0 : safeInt(progress.getLosses()),
                progress == null ? 0 : safeInt(progress.getLossStreak())
            ));
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
