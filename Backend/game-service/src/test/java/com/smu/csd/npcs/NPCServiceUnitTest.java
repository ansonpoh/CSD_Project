package com.smu.csd.npcs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.npc_map.NPCMapRepository;

public class NPCServiceUnitTest {

    private NPCRepository npcRepository;
    private NPCMapRepository npcMapRepository;
    private MapRepository mapRepository;
    private RestTemplate restTemplate;
    private NPCService npcService;

    @BeforeEach
    void setUp() {
        npcRepository = mock(NPCRepository.class);
        npcMapRepository = mock(NPCMapRepository.class);
        mapRepository = mock(MapRepository.class);
        restTemplate = mock(RestTemplate.class);
        npcService = new NPCService(npcRepository, npcMapRepository, mapRepository, restTemplate);
    }

    @Test
    void getNPCById_ReturnsNpcWhenPresent() {
        UUID npcId = UUID.randomUUID();
        NPC npc = NPC.builder()
                .npcId(npcId)
                .name("Professor Byte")
                .build();

        when(npcRepository.findById(npcId)).thenReturn(Optional.of(npc));

        NPC result = npcService.getNPCById(npcId);

        assertEquals(npcId, result.getNpcId());
        assertEquals("Professor Byte", result.getName());
    }

    @Test
    void getNPCById_ThrowsWhenNpcMissing() {
        UUID npcId = UUID.randomUUID();
        when(npcRepository.findById(npcId)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> npcService.getNPCById(npcId));

        assertEquals("NPC not found.", exception.getMessage());
    }
}
