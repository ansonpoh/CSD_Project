package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.encounters.EncounterService;
import com.smu.csd.monsters.MonsterService;
import com.smu.csd.npcs.npc_map.NPCMapAssignRequest;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;

public class InternalGameControllerUnitTest {

    private InternalGameController controller;
    private MapRepository mapRepository;
    private NPCService npcService;
    private EncounterService encounterService;
    private MonsterService monsterService;

    @BeforeEach
    public void setUp() {
        mapRepository = mock(MapRepository.class);
        npcService = mock(NPCService.class);
        encounterService = mock(EncounterService.class);
        monsterService = mock(MonsterService.class);
        controller = new InternalGameController(mapRepository, npcService, encounterService, monsterService);
    }

    @Test
    public void testGetMapByIdSuccess() {
        UUID mapId = UUID.randomUUID();
        com.smu.csd.maps.Map map = new com.smu.csd.maps.Map();
        map.setMapId(mapId);
        map.setName("Test Map");
        
        when(mapRepository.findById(mapId)).thenReturn(Optional.of(map));

        ResponseEntity<Map<String, Object>> response = controller.getMapById(mapId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(mapId, response.getBody().get("mapId"));
    }

    @Test
    public void testGetMapByIdNotFound() {
        UUID mapId = UUID.randomUUID();
        when(mapRepository.findById(mapId)).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response = controller.getMapById(mapId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void testGetMapContentsFiltersOutRowsWithoutContentIds() {
        UUID mapId = UUID.randomUUID();
        NPCMapLessonResponse withContent = new NPCMapLessonResponse(
                UUID.randomUUID(),
                "NPC One",
                "npc-asset",
                UUID.randomUUID(),
                "Content One",
                "Body One",
                UUID.randomUUID(),
                "Topic",
                null,
                4.5,
                2L,
                5
        );
        NPCMapLessonResponse withoutContent = new NPCMapLessonResponse(
                UUID.randomUUID(),
                "NPC Two",
                "npc-asset",
                null,
                "Content Two",
                "Body Two",
                UUID.randomUUID(),
                "Topic",
                null,
                4.0,
                1L,
                4
        );
        when(npcService.getNPCsByMapId(mapId)).thenReturn(List.of(withContent, withoutContent));

        ResponseEntity<List<Map<String, Object>>> response = controller.getMapContents(mapId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals("NPC One", response.getBody().get(0).get("npcName"));
        assertEquals("Content One", response.getBody().get(0).get("contentTitle"));
        assertEquals("Body One", response.getBody().get(0).get("contentBody"));
    }

    @Test
    public void testAssignContentReturnsBadRequestWhenServiceThrows() {
        NPCMapAssignRequest request = new NPCMapAssignRequest(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        when(npcService.assignContent(request)).thenThrow(new RuntimeException("assignment failed"));

        ResponseEntity<?> response = controller.assignContent(request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        assertEquals("assignment failed", ((Map<?, ?>) response.getBody()).get("error"));
    }

    @Test
    public void testHasAllNpcsCompletedProxiesEncounterServiceResult() {
        UUID learnerId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        when(encounterService.hasAllNpcsCompletedOnMap(learnerId, mapId)).thenReturn(true);

        ResponseEntity<Boolean> response = controller.hasAllNpcsCompleted(learnerId, mapId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Boolean.TRUE, response.getBody());
    }

    @Test
    public void testGetMonsterByIdDefaultsNullNameToMonster() {
        UUID monsterId = UUID.randomUUID();
        com.smu.csd.monsters.Monster monster = com.smu.csd.monsters.Monster.builder()
                .monsterId(monsterId)
                .name(null)
                .build();
        when(monsterService.getMonsterById(monsterId)).thenReturn(monster);

        ResponseEntity<Map<String, Object>> response = controller.getMonsterById(monsterId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("monster", response.getBody().get("name"));
    }
}
