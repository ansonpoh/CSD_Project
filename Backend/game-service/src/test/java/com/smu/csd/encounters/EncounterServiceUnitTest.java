package com.smu.csd.encounters;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultRequestDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultResponseDto;
import com.smu.csd.encounters.dtos.EncounterClaimRewardResponseDto;
import com.smu.csd.encounters.dtos.EncounterStateDto;
import com.smu.csd.encounters.dtos.EncounterTelemetryDashboardDto;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.monsters.Monster;
import com.smu.csd.monsters.MonsterService;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;

public class EncounterServiceUnitTest {

    private NPCService npcService;
    private MonsterService monsterService;
    private MonsterProgressRepository monsterProgressRepository;
    private MapRepository mapRepository;
    private RestTemplate restTemplate;
    private EncounterService encounterService;

    @BeforeEach
    void setUp() {
        npcService = mock(NPCService.class);
        monsterService = mock(MonsterService.class);
        monsterProgressRepository = mock(MonsterProgressRepository.class);
        mapRepository = mock(MapRepository.class);
        restTemplate = mock(RestTemplate.class);
        encounterService = new EncounterService(npcService, monsterService, monsterProgressRepository, mapRepository, restTemplate);
    }

    @Test
    void recordCombatResult_ThrowsWhenNpcCompletionGateNotMet() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 0, 1, 0);
        Monster monster = Monster.builder().monsterId(monsterId).name("Gate Keeper").build();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));
        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of());

        EncounterCombatResultRequestDto request = new EncounterCombatResultRequestDto(mapId, monsterId);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> encounterService.recordCombatResult(request, supabaseUserId)
        );

        assertTrue(exception.getMessage().contains("Monsters unlock only after all NPC lessons are completed"));
        verify(monsterProgressRepository, never()).save(any(MonsterProgress.class));
    }

    @Test
    void hasAllNpcsCompletedOnMap_ReturnsTrueWhenPlayerServiceConfirmsCompletion() {
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();

        NPCMapLessonResponse npcLesson = new NPCMapLessonResponse(
                UUID.randomUUID(),
                "Guide NPC",
                "npc_asset",
                contentId,
                "Lesson",
                "Body",
                UUID.randomUUID(),
                "Topic",
                null,
                null,
                null,
                null
        );

        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(npcLesson));
        when(restTemplate.postForEntity(anyString(), any(), eq(Boolean.class)))
                .thenReturn(ResponseEntity.ok(true));

        boolean result = encounterService.hasAllNpcsCompletedOnMap(learnerId, mapId);

        assertTrue(result);
    }

    @Test
    void hasAllNpcsCompletedOnMap_ReturnsFalseWhenNoNpcLessonsExist() {
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();

        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of());

        boolean result = encounterService.hasAllNpcsCompletedOnMap(learnerId, mapId);

        assertFalse(result);
        verify(restTemplate, never()).postForEntity(anyString(), any(), eq(Boolean.class));
    }

    @Test
    void getEncounterState_RejectsNullMapId() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> encounterService.getEncounterState(null, UUID.randomUUID())
        );

        assertTrue(exception.getMessage().contains("mapId is required"));
    }

    @Test
    void markNpcInteracted_RejectsNullMapIdOrNpcId() {
        UUID supabaseUserId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> encounterService.markNpcInteracted(null, UUID.randomUUID(), supabaseUserId));
        assertThrows(IllegalArgumentException.class, () -> encounterService.markNpcInteracted(UUID.randomUUID(), null, supabaseUserId));
    }

    @Test
    void recordCombatResult_RejectsNullMapIdOrMonsterId() {
        UUID supabaseUserId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> encounterService.recordCombatResult(new EncounterCombatResultRequestDto(null, UUID.randomUUID()), supabaseUserId));
        assertThrows(IllegalArgumentException.class, () -> encounterService.recordCombatResult(new EncounterCombatResultRequestDto(UUID.randomUUID(), null), supabaseUserId));
    }

    @Test
    void recordCombatResult_RejectsMonsterNotBelongingToMap() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();
        UUID otherMonsterId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 0, 1, 0);
        Monster monster = Monster.builder().monsterId(otherMonsterId).name("Other").build();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> encounterService.recordCombatResult(new EncounterCombatResultRequestDto(mapId, monsterId), supabaseUserId)
        );

        assertEquals("Monster does not belong to map.", exception.getMessage());
        verify(monsterProgressRepository, never()).save(any(MonsterProgress.class));
    }

    @Test
    void recordCombatResult_IncrementsWinStatsAndMarksMonsterDefeated() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 0, 1, 0);
        Monster monster = Monster.builder().monsterId(monsterId).name("Boss").build();
        MonsterProgress progress = MonsterProgress.builder()
                .learnerId(learnerId)
                .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                .monster(monster)
                .attempts(0)
                .wins(0)
                .losses(0)
                .lossStreak(0)
                .monsterDefeated(false)
                .rewardClaimed(false)
                .build();
        NPCMapLessonResponse npcLesson = new NPCMapLessonResponse(
                npcId, "Guide", "asset", contentId, "Title", "Body", UUID.randomUUID(), "Topic", null, null, null, null
        );

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));
        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(npcLesson));
        when(restTemplate.getForEntity(anyString(), eq(Boolean.class))).thenReturn(ResponseEntity.ok(true));
        when(restTemplate.postForEntity(anyString(), any(), eq(Boolean.class))).thenReturn(ResponseEntity.ok(true));
        when(monsterProgressRepository.findByLearnerIdAndMapMapIdAndMonsterMonsterId(learnerId, mapId, monsterId)).thenReturn(Optional.of(progress));
        when(monsterProgressRepository.save(any(MonsterProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EncounterCombatResultResponseDto result = encounterService.recordCombatResult(new EncounterCombatResultRequestDto(mapId, monsterId), supabaseUserId);

        assertTrue(result.won());
        assertEquals(1, result.attempts());
        assertEquals(1, result.wins());
        assertEquals(0, result.losses());
        assertTrue(result.monsterDefeated());
        verify(monsterProgressRepository).save(any(MonsterProgress.class));
    }

    @Test
    void recordCombatResult_IncrementsLossStatsAndLossStreak() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 0, 1, 0);
        Monster monster = Monster.builder().monsterId(monsterId).name("Boss").build();
        MonsterProgress progress = MonsterProgress.builder()
                .learnerId(learnerId)
                .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                .monster(monster)
                .attempts(2)
                .wins(1)
                .losses(0)
                .lossStreak(1)
                .monsterDefeated(false)
                .rewardClaimed(false)
                .build();
        NPCMapLessonResponse npcLesson = new NPCMapLessonResponse(
                npcId, "Guide", "asset", contentId, "Title", "Body", UUID.randomUUID(), "Topic", null, null, null, null
        );

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));
        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(npcLesson));
        when(restTemplate.postForEntity(anyString(), any(), eq(Boolean.class))).thenReturn(ResponseEntity.ok(true));
        when(monsterProgressRepository.findByLearnerIdAndMapMapIdAndMonsterMonsterId(learnerId, mapId, monsterId)).thenReturn(Optional.of(progress));
        when(monsterProgressRepository.save(any(MonsterProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EncounterCombatResultResponseDto result = encounterService.recordCombatResult(new EncounterCombatResultRequestDto(mapId, monsterId), supabaseUserId);

        assertFalse(result.won());
        assertEquals(3, result.attempts());
        assertEquals(1, result.wins());
        assertEquals(1, result.losses());
        assertEquals(2, result.lossStreak());
        assertFalse(result.monsterDefeated());
        verify(monsterProgressRepository).save(any(MonsterProgress.class));
    }

    @Test
    void claimReward_RejectsWhenMonsterHasNotBeenDefeated() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 0, 1, 0);
        Monster monster = Monster.builder().monsterId(monsterId).name("Monster").build();
        MonsterProgress progress = MonsterProgress.builder()
                .learnerId(learnerId)
                .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                .monster(monster)
                .monsterDefeated(false)
                .rewardClaimed(false)
                .build();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));
        when(monsterProgressRepository.findByLearnerIdAndMapMapIdAndMonsterMonsterId(learnerId, mapId, monsterId)).thenReturn(Optional.of(progress));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> encounterService.claimReward(mapId, monsterId, supabaseUserId)
        );

        assertEquals("Reward can only be claimed after defeating the monster.", exception.getMessage());
        verify(monsterProgressRepository, never()).save(any(MonsterProgress.class));
    }

    @Test
    void claimReward_AwardsXpAndGoldOnFirstClaim() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 100, 2, 50);
        LearnerDto updatedLearner = new LearnerDto(learnerId, 190, 3, 150);
        Monster monster = Monster.builder().monsterId(monsterId).name("Monster").build();
        MonsterProgress progress = MonsterProgress.builder()
                .learnerId(learnerId)
                .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                .monster(monster)
                .monsterDefeated(true)
                .rewardClaimed(false)
                .build();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));
        when(monsterProgressRepository.findByLearnerIdAndMapMapIdAndMonsterMonsterId(learnerId, mapId, monsterId)).thenReturn(Optional.of(progress));
        when(restTemplate.postForObject(anyString(), any(), eq(LearnerDto.class))).thenReturn(updatedLearner);
        when(monsterProgressRepository.save(any(MonsterProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EncounterClaimRewardResponseDto result = encounterService.claimReward(mapId, monsterId, supabaseUserId);

        assertEquals(140, result.xpAwarded());
        assertEquals(100, result.goldAwarded());
        assertEquals(190, result.learnerTotalXp());
        assertEquals(3, result.learnerLevel());
        assertEquals(150, result.learnerGold());
        verify(monsterProgressRepository).save(any(MonsterProgress.class));
    }

    @Test
    void claimReward_IsIdempotentAfterRewardClaimed() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();

        LearnerDto learner = new LearnerDto(learnerId, 100, 2, 50);
        Monster monster = Monster.builder().monsterId(monsterId).name("Monster").build();
        MonsterProgress progress = MonsterProgress.builder()
                .learnerId(learnerId)
                .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                .monster(monster)
                .monsterDefeated(true)
                .rewardClaimed(true)
                .build();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(monster));
        when(monsterProgressRepository.findByLearnerIdAndMapMapIdAndMonsterMonsterId(learnerId, mapId, monsterId)).thenReturn(Optional.of(progress));

        EncounterClaimRewardResponseDto result = encounterService.claimReward(mapId, monsterId, supabaseUserId);

        assertEquals(0, result.xpAwarded());
        assertEquals(0, result.goldAwarded());
        assertEquals(100, result.learnerTotalXp());
        assertEquals(2, result.learnerLevel());
        assertEquals(50, result.learnerGold());
        verify(restTemplate, never()).postForObject(anyString(), any(), eq(LearnerDto.class));
        verify(monsterProgressRepository, never()).save(any(MonsterProgress.class));
    }

    @Test
    void getEncounterState_BuildsNpcSummaryAndMonsterStateFromCompletedContentAndStoredMonsterProgress() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID completedContentId = UUID.randomUUID();
        UUID incompleteContentId = UUID.randomUUID();
        UUID completedNpcId = UUID.randomUUID();
        UUID incompleteNpcId = UUID.randomUUID();
        UUID normalMonsterId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID bossMonsterId = UUID.fromString("00000000-0000-0000-0000-0000000000ff");

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 0, 1, 0));
        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(
                new NPCMapLessonResponse(completedNpcId, "Guide", "asset", completedContentId, "Title", "Body", UUID.randomUUID(), "Topic", null, null, null, null),
                new NPCMapLessonResponse(incompleteNpcId, "Guide2", "asset", incompleteContentId, "Title", "Body", UUID.randomUUID(), "Topic", null, null, null, null)
        ));
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(
                Monster.builder().monsterId(normalMonsterId).name("Normal").build(),
                Monster.builder().monsterId(bossMonsterId).name("Boss").build()
        ));
        when(restTemplate.postForObject(anyString(), any(), eq(UUID[].class))).thenReturn(new UUID[] { completedContentId });
        when(monsterProgressRepository.findAllByLearnerIdAndMapMapId(learnerId, mapId)).thenReturn(List.of(
                MonsterProgress.builder()
                        .learnerId(learnerId)
                        .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                        .monster(Monster.builder().monsterId(normalMonsterId).name("Normal").build())
                        .attempts(2)
                        .wins(1)
                        .losses(1)
                        .lossStreak(0)
                        .monsterDefeated(true)
                        .rewardClaimed(false)
                        .build()
        ));

        EncounterStateDto result = encounterService.getEncounterState(mapId, supabaseUserId);

        assertEquals(2, result.npc().total());
        assertEquals(1, result.npc().completed());
        assertTrue(result.npc().completedNpcIds().contains(completedNpcId));
        assertFalse(result.npc().allCompleted());
        assertEquals(2, result.monsters().size());
        assertTrue(result.monsters().stream().anyMatch(monster -> monster.monsterId().equals(normalMonsterId) && monster.monsterDefeated() && monster.attempts() == 2));
        assertTrue(result.monsters().stream().anyMatch(monster -> monster.monsterId().equals(bossMonsterId) && monster.boss()));
    }

    @Test
    void markNpcInteracted_ReturnsTheCompletedMessageWhenTheNpcLessonIsAlreadyCompleted() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 0, 1, 0));
        when(restTemplate.getForObject(anyString(), eq(Boolean.class))).thenReturn(true);
        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(
                new NPCMapLessonResponse(npcId, "Guide", "asset", contentId, "Title", "Body", UUID.randomUUID(), "Topic", null, null, null, null)
        ));
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of());
        when(restTemplate.postForObject(anyString(), any(), eq(UUID[].class))).thenReturn(new UUID[] { contentId });
        when(monsterProgressRepository.findAllByLearnerIdAndMapMapId(learnerId, mapId)).thenReturn(List.of());

        String message = encounterService.markNpcInteracted(mapId, npcId, supabaseUserId).message();

        assertEquals("NPC lesson is completed.", message);
    }

    @Test
    void claimReward_AwardsNormalMonsterXpDifferentlyFromBossMonsters() {
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID normalMonsterId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID bossMonsterId = UUID.fromString("00000000-0000-0000-0000-0000000000ff");
        LearnerDto learner = new LearnerDto(learnerId, 10, 1, 5);
        LearnerDto updatedLearner = new LearnerDto(learnerId, 100, 2, 105);
        Monster normal = Monster.builder().monsterId(normalMonsterId).name("Normal").build();
        Monster boss = Monster.builder().monsterId(bossMonsterId).name("Boss").build();
        MonsterProgress progress = MonsterProgress.builder()
                .learnerId(learnerId)
                .map(com.smu.csd.maps.Map.builder().mapId(mapId).build())
                .monster(normal)
                .monsterDefeated(true)
                .rewardClaimed(false)
                .build();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(monsterService.getMonstersByMapId(mapId)).thenReturn(List.of(normal, boss));
        when(monsterProgressRepository.findByLearnerIdAndMapMapIdAndMonsterMonsterId(learnerId, mapId, normalMonsterId)).thenReturn(Optional.of(progress));
        when(restTemplate.postForObject(anyString(), any(), eq(LearnerDto.class))).thenReturn(updatedLearner);
        when(monsterProgressRepository.save(any(MonsterProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EncounterClaimRewardResponseDto result = encounterService.claimReward(mapId, normalMonsterId, supabaseUserId);

        assertEquals(90, result.xpAwarded());
        assertEquals(100, result.goldAwarded());
    }

    @Test
    void getTelemetryDashboard_FiltersByMapIdAndComputesWinLossPercentagesCorrectly() {
        UUID mapId = UUID.randomUUID();
        UUID otherMapId = UUID.randomUUID();
        when(monsterProgressRepository.findAll()).thenReturn(List.of(
                MonsterProgress.builder().map(com.smu.csd.maps.Map.builder().mapId(mapId).build()).attempts(2).wins(1).losses(1).rewardClaimed(true).build(),
                MonsterProgress.builder().map(com.smu.csd.maps.Map.builder().mapId(mapId).build()).attempts(1).wins(1).losses(0).rewardClaimed(false).build(),
                MonsterProgress.builder().map(com.smu.csd.maps.Map.builder().mapId(otherMapId).build()).attempts(3).wins(0).losses(3).rewardClaimed(true).build()
        ));

        EncounterTelemetryDashboardDto result = encounterService.getTelemetryDashboard(mapId);

        assertEquals(2, result.combatStarted());
        assertEquals(2, result.combatWon());
        assertEquals(1, result.combatLost());
        assertEquals(1, result.rewardClaimed());
        assertEquals(100.0, result.winRate());
        assertEquals(50.0, result.lossRate());
    }

    @Test
    void hasAllNpcsCompletedOnMap_ReturnsFalseWhenThePlayerServiceCheckThrows() {
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();

        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(
                new NPCMapLessonResponse(UUID.randomUUID(), "Guide", "asset", contentId, "Title", "Body", UUID.randomUUID(), "Topic", null, null, null, null)
        ));
        when(restTemplate.postForEntity(anyString(), any(), eq(Boolean.class))).thenThrow(new RuntimeException("down"));

        assertFalse(encounterService.hasAllNpcsCompletedOnMap(learnerId, mapId));
    }
}
