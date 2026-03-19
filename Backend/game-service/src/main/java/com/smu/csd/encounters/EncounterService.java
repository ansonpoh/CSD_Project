package com.smu.csd.encounters;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;

import com.smu.csd.dtos.AwardXpRequestDto;
import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.dtos.ProgressCheckRequestDto;
import com.smu.csd.encounters.dtos.EncounterClaimRewardResponseDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultRequestDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultResponseDto;
import com.smu.csd.encounters.dtos.EncounterNpcInteractResponseDto;
import com.smu.csd.encounters.dtos.EncounterStateDto;
import com.smu.csd.encounters.dtos.EncounterTelemetryDashboardDto;
import com.smu.csd.encounters.dtos.MonsterStateDto;
import com.smu.csd.encounters.dtos.NpcSummaryDto;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.monsters.Monster;
import com.smu.csd.monsters.MonsterService;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;

@Service
public class EncounterService {
    private record ContentCompletionBatchRequestDto(UUID learnerId, List<UUID> contentIds) {}

    private final NPCService npcService;
    private final MonsterService monsterService;
    private final MonsterProgressRepository monsterProgressRepository;
    private final MapRepository mapRepository;
    private final RestTemplate restTemplate;

    @Value("${player.url:http://player-service:8084}")
    private String playerServiceUrl;

    public EncounterService(
        NPCService npcService,
        MonsterService monsterService,
        MonsterProgressRepository monsterProgressRepository,
        MapRepository mapRepository,
        RestTemplate restTemplate
    ) {
        this.npcService = npcService;
        this.monsterService = monsterService;
        this.monsterProgressRepository = monsterProgressRepository;
        this.mapRepository = mapRepository;
        this.restTemplate = restTemplate;
    }

    public EncounterStateDto getEncounterState(UUID mapId, UUID supabaseUserId) {
        if (mapId == null) throw new IllegalArgumentException("mapId is required.");
        LearnerDto learner = requireLearner(supabaseUserId);

        List<NPCMapLessonResponse> npcs = getMapNpcs(mapId);
        List<Monster> monsters = getMapMonsters(mapId);

        List<UUID> lessonContentIds = npcs.stream()
            .map(NPCMapLessonResponse::contentId)
            .filter(id -> id != null)
            .distinct()
            .toList();

        Set<UUID> completedContentIds = new HashSet<>(getCompletedContentIds(learner.learnerId(), lessonContentIds));

        List<UUID> completedNpcIds = npcs.stream()
            .filter(npc -> npc.npcId() != null && npc.contentId() != null && completedContentIds.contains(npc.contentId()))
            .map(NPCMapLessonResponse::npcId)
            .distinct()
            .toList();

        int totalNpcs = lessonContentIds.size();
        int completedNpcCount = completedContentIds.size();
        boolean allNpcsCompleted = totalNpcs > 0 && completedNpcCount >= totalNpcs;

        List<MonsterStateDto> monsterState = buildMonsterState(monsters, learner, mapId, allNpcsCompleted);
        NpcSummaryDto npcSummary = new NpcSummaryDto(totalNpcs, completedNpcCount, completedNpcIds, allNpcsCompleted);

        return new EncounterStateDto(mapId, npcSummary, monsterState);
    }

    public EncounterNpcInteractResponseDto markNpcInteracted(UUID mapId, UUID npcId, UUID supabaseUserId) {
        if (mapId == null || npcId == null) {
            throw new IllegalArgumentException("mapId and npcId are required.");
        }

        LearnerDto learner = requireLearner(supabaseUserId);
        boolean npcCompleted = isNpcCompleted(learner.learnerId(), npcId);
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

        LearnerDto learner = requireLearner(supabaseUserId);
        ensureMonsterBelongsToMap(monsterId, mapId);

        boolean allNpcsCompleted = hasAllNpcsCompletedOnMap(learner.learnerId(), mapId);
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

        LearnerDto learner = requireLearner(supabaseUserId);
        ensureMonsterBelongsToMap(monsterId, mapId);

        MonsterProgress progress = getOrCreateMonsterProgress(learner, mapId, monsterId);
        if (!Boolean.TRUE.equals(progress.getMonsterDefeated())) {
            throw new IllegalStateException("Reward can only be claimed after defeating the monster.");
        }

        int xpAwarded = 0;
        int goldAwarded = 0;
        LearnerDto updatedLearner = learner;
        
        if (!Boolean.TRUE.equals(progress.getRewardClaimed())) {
            xpAwarded = isBossMonster(mapId, monsterId) ? 140 : 90;
            goldAwarded = 100;
            
            // Call internal API to award XP
            try {
                String url = playerServiceUrl + "/api/internal/learners/" + learner.learnerId() + "/award-xp";
                AwardXpRequestDto request = new AwardXpRequestDto(xpAwarded, goldAwarded);
                updatedLearner = restTemplate.postForObject(url, request, LearnerDto.class);
            } catch (Exception e) {
                System.err.println("Failed to award rewards: " + e.getMessage());
            }

            progress.setRewardClaimed(true);
            if (progress.getRewardClaimedAt() == null) progress.setRewardClaimedAt(LocalDateTime.now());
            monsterProgressRepository.save(progress);
        }

        return new EncounterClaimRewardResponseDto(
            mapId,
            monsterId,
            xpAwarded,
            goldAwarded,
            updatedLearner != null ? safeInt(updatedLearner.totalXp()) : safeInt(learner.totalXp()),
            updatedLearner != null ? safeInt(updatedLearner.level()) : safeInt(learner.level()),
            updatedLearner != null ? safeInt(updatedLearner.gold()) : safeInt(learner.gold()),
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
        LearnerDto learner,
        UUID mapId,
        boolean allNpcsCompleted
    ) {
        List<Monster> ordered = new ArrayList<>(monsters);
        ordered.sort(Comparator.comparing(monster -> asString(monster.getMonsterId())));

        Map<UUID, MonsterProgress> progressByMonsterId = new HashMap<>();
        monsterProgressRepository.findAllByLearnerIdAndMapMapId(learner.learnerId(), mapId)
            .forEach(progress -> {
                if (progress != null && progress.getMonster() != null && progress.getMonster().getMonsterId() != null) {
                    progressByMonsterId.put(progress.getMonster().getMonsterId(), progress);
                }
            });

        List<MonsterStateDto> rows = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            Monster monster = ordered.get(i);
            if (monster == null || monster.getMonsterId() == null) continue;

            MonsterProgress progress = progressByMonsterId.get(monster.getMonsterId());

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

    public boolean hasAllNpcsCompletedOnMap(UUID learnerId, UUID mapId) {
        List<UUID> contentIds = getMapNpcs(mapId).stream()
            .map(NPCMapLessonResponse::contentId)
            .filter(id -> id != null)
            .distinct()
            .toList();
        if (contentIds.isEmpty()) return false;

        try {
            String url = playerServiceUrl + "/api/internal/progress/check-completed";
            ProgressCheckRequestDto request = new ProgressCheckRequestDto(learnerId, contentIds);
            ResponseEntity<Boolean> response = restTemplate.postForEntity(url, request, Boolean.class);
            return Boolean.TRUE.equals(response.getBody());
        } catch (Exception e) {
            System.err.println("Failed to check map progress: " + e.getMessage());
            return false;
        }
    }

    private boolean isNpcCompleted(UUID learnerId, UUID npcId) {
        try {
            String url = playerServiceUrl + "/api/internal/progress/npc-completed?learnerId=" + learnerId + "&npcId=" + npcId;
            return Boolean.TRUE.equals(restTemplate.getForObject(url, Boolean.class));
        } catch (Exception e) {
            return false;
        }
    }

    private List<UUID> getCompletedContentIds(UUID learnerId, List<UUID> contentIds) {
        if (learnerId == null || contentIds == null || contentIds.isEmpty()) return List.of();

        try {
            String url = playerServiceUrl + "/api/internal/progress/content-completed/batch";
            UUID[] completed = restTemplate.postForObject(
                url,
                new ContentCompletionBatchRequestDto(learnerId, contentIds),
                UUID[].class
            );
            if (completed == null || completed.length == 0) return List.of();
            return List.of(completed);
        } catch (Exception e) {
            System.err.println("Failed to fetch completed content ids in batch: " + e.getMessage());
            return List.of();
        }
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

    private MonsterProgress getOrCreateMonsterProgress(LearnerDto learner, UUID mapId, UUID monsterId) {
        MonsterProgress existing = monsterProgressRepository
            .findByLearnerIdAndMapMapIdAndMonsterMonsterId(learner.learnerId(), mapId, monsterId)
            .orElse(null);
        if (existing != null) return existing;

        Monster monster = monsterService.getMonsterById(monsterId);
        com.smu.csd.maps.Map map = mapRepository.findById(mapId)
            .orElseThrow(() -> new IllegalArgumentException("Map not found."));

        return MonsterProgress.builder()
            .learnerId(learner.learnerId())
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

    private LearnerDto requireLearner(UUID supabaseUserId) {
        try {
            String url = playerServiceUrl + "/api/internal/learners/supabase/" + supabaseUserId;
            LearnerDto learner = restTemplate.getForObject(url, LearnerDto.class);
            if (learner == null) throw new IllegalArgumentException("Learner profile not found for current user.");
            return learner;
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to fetch Learner profile", e);
        }
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
