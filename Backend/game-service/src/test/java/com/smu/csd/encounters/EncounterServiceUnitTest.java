package com.smu.csd.encounters;

import static org.junit.jupiter.api.Assertions.assertFalse;
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
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.encounters.dtos.EncounterCombatResultRequestDto;
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

        EncounterCombatResultRequestDto request = new EncounterCombatResultRequestDto(mapId, monsterId, true);

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
}
