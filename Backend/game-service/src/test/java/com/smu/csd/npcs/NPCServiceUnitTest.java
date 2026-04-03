package com.smu.csd.npcs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
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
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.ContentDto;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapAssignRequest;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;
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

    @Test
    void getNPCsByMapId_FiltersOutNonApprovedContentEntries() {
        UUID mapId = UUID.randomUUID();
        UUID approvedContentId = UUID.randomUUID();
        UUID rejectedContentId = UUID.randomUUID();
        NPC approvedNpc = NPC.builder().npcId(UUID.randomUUID()).name("Approved").asset("a").build();
        NPC rejectedNpc = NPC.builder().npcId(UUID.randomUUID()).name("Rejected").asset("b").build();
        NPCMap approvedMapping = NPCMap.builder().npc(approvedNpc).contentId(approvedContentId).build();
        NPCMap rejectedMapping = NPCMap.builder().npc(rejectedNpc).contentId(rejectedContentId).build();

        when(npcMapRepository.findAllByMapMapId(mapId)).thenReturn(List.of(approvedMapping, rejectedMapping));
        when(restTemplate.postForObject(anyString(), anyList(), eq(ContentDto[].class))).thenReturn(new ContentDto[] {
                new ContentDto(approvedContentId, "Approved", "Body", UUID.randomUUID(), "Topic", null, "APPROVED", 4.5, 10L),
                new ContentDto(rejectedContentId, "Rejected", "Body", UUID.randomUUID(), "Topic", null, "PENDING_REVIEW", 3.0, 2L)
        });

        List<NPCMapLessonResponse> result = npcService.getNPCsByMapId(mapId);

        assertEquals(1, result.size());
        assertEquals(approvedNpc.getNpcId(), result.get(0).npcId());
    }

    @Test
    void getNPCsByMapId_ReturnsEmptyWhenContentBatchLookupFails() {
        UUID mapId = UUID.randomUUID();
        NPCMap mapping = NPCMap.builder()
                .npc(NPC.builder().npcId(UUID.randomUUID()).name("Guide").asset("asset").build())
                .contentId(UUID.randomUUID())
                .build();

        when(npcMapRepository.findAllByMapMapId(mapId)).thenReturn(List.of(mapping));
        when(restTemplate.postForObject(anyString(), anyList(), eq(ContentDto[].class))).thenThrow(new RuntimeException("downstream unavailable"));

        assertTrue(npcService.getNPCsByMapId(mapId).isEmpty());
    }

    @Test
    void assignContent_RejectsUnpublishedMaps() {
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();

        when(npcRepository.findById(npcId)).thenReturn(Optional.of(NPC.builder().npcId(npcId).build()));
        when(mapRepository.findById(mapId)).thenReturn(Optional.of(com.smu.csd.maps.Map.builder().mapId(mapId).published(false).build()));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> npcService.assignContent(new NPCMapAssignRequest(npcId, mapId, contentId))
        );

        assertEquals("Map is not published and cannot accept NPC/content assignments.", exception.getMessage());
    }

    @Test
    void assignContent_RejectsMissingOrUnavailableContent() {
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();

        when(npcRepository.findById(npcId)).thenReturn(Optional.of(NPC.builder().npcId(npcId).build()));
        when(mapRepository.findById(mapId)).thenReturn(Optional.of(com.smu.csd.maps.Map.builder().mapId(mapId).published(true).build()));
        when(restTemplate.getForObject(anyString(), eq(ContentDto.class))).thenReturn(null);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> npcService.assignContent(new NPCMapAssignRequest(npcId, mapId, contentId))
        );

        assertTrue(exception.getMessage().contains("Content not found or unavailable"));
        verify(npcMapRepository, never()).save(any(NPCMap.class));
    }

    @Test
    void assignContent_UpdatesExistingMappingInsteadOfCreatingDuplicate() {
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID oldContentId = UUID.randomUUID();
        UUID newContentId = UUID.randomUUID();
        NPC npc = NPC.builder().npcId(npcId).name("Guide").asset("asset").build();
        com.smu.csd.maps.Map map = com.smu.csd.maps.Map.builder().mapId(mapId).published(true).build();
        NPCMap current = NPCMap.builder().npc(npc).map(map).contentId(oldContentId).build();

        when(npcRepository.findById(npcId)).thenReturn(Optional.of(npc));
        when(mapRepository.findById(mapId)).thenReturn(Optional.of(map));
        when(restTemplate.getForObject(anyString(), eq(ContentDto.class))).thenReturn(new ContentDto(newContentId, "Title", "Body", UUID.randomUUID(), "Topic", null, "APPROVED", 5.0, 1L));
        when(npcMapRepository.findAllByMapMapIdAndNpcNpcId(mapId, npcId)).thenReturn(List.of(current));
        when(npcMapRepository.save(any(NPCMap.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NPCMap result = npcService.assignContent(new NPCMapAssignRequest(npcId, mapId, newContentId));

        assertEquals(newContentId, result.getContentId());
        verify(npcMapRepository).save(current);
    }

    @Test
    void assignContent_RejectsWhenApprovedNpcCapIsExceeded() {
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        NPC npc = NPC.builder().npcId(npcId).name("Guide").asset("asset").build();
        com.smu.csd.maps.Map map = com.smu.csd.maps.Map.builder().mapId(mapId).published(true).build();
        List<NPCMap> existing = List.of(
                NPCMap.builder().npc(NPC.builder().npcId(UUID.randomUUID()).build()).map(map).contentId(UUID.randomUUID()).build(),
                NPCMap.builder().npc(NPC.builder().npcId(UUID.randomUUID()).build()).map(map).contentId(UUID.randomUUID()).build(),
                NPCMap.builder().npc(NPC.builder().npcId(UUID.randomUUID()).build()).map(map).contentId(UUID.randomUUID()).build(),
                NPCMap.builder().npc(NPC.builder().npcId(UUID.randomUUID()).build()).map(map).contentId(UUID.randomUUID()).build(),
                NPCMap.builder().npc(NPC.builder().npcId(UUID.randomUUID()).build()).map(map).contentId(UUID.randomUUID()).build()
        );

        when(npcRepository.findById(npcId)).thenReturn(Optional.of(npc));
        when(mapRepository.findById(mapId)).thenReturn(Optional.of(map));
        when(restTemplate.getForObject(anyString(), eq(ContentDto.class))).thenReturn(new ContentDto(contentId, "Title", "Body", UUID.randomUUID(), "Topic", null, "APPROVED", 5.0, 1L));
        when(npcMapRepository.findAllByMapMapIdAndNpcNpcId(mapId, npcId)).thenReturn(List.of());
        when(npcMapRepository.findAllByMapMapId(mapId)).thenReturn(existing);
        when(restTemplate.postForObject(anyString(), anyList(), eq(ContentDto[].class))).thenReturn(existing.stream()
                .map(mapping -> new ContentDto(mapping.getContentId(), "Title", "Body", UUID.randomUUID(), "Topic", null, "APPROVED", 5.0, 1L))
                .toArray(ContentDto[]::new));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> npcService.assignContent(new NPCMapAssignRequest(npcId, mapId, contentId))
        );

        assertTrue(exception.getMessage().contains("maximum number of approved NPCs"));
    }
}
