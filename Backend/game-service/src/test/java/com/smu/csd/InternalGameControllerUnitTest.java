package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.encounters.EncounterService;
import com.smu.csd.monsters.MonsterService;

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
}
