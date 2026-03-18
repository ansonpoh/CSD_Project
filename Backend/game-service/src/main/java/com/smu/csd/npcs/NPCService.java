package com.smu.csd.npcs;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import com.smu.csd.dtos.ContentDto;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapAssignRequest;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;
import com.smu.csd.npcs.npc_map.NPCMapRepository;

@Service
public class NPCService {

    private final NPCMapRepository npcMapRepository;
    private final NPCRepository repository;
    private final MapRepository mapRepository;
    private final RestTemplate restTemplate;

    @Value("${backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${learning.url:http://localhost:8083}")
    private String learningServiceUrl;

    public NPCService(NPCRepository repository, NPCMapRepository npcMapRepository,
                      MapRepository mapRepository, RestTemplate restTemplate) {
        this.npcMapRepository = npcMapRepository;
        this.repository = repository;
        this.mapRepository = mapRepository;
        this.restTemplate = restTemplate;
    }

    public List<NPC> getAllNPCs() {
        return repository.findAll();
    }

    public NPC getNPCById(UUID npc_id) {
        return repository.findById(npc_id).orElseThrow(() -> new RuntimeException("NPC not found."));
    }

    public List<NPCMapLessonResponse> getNPCsByMapId(UUID map_id) {
        List<NPCMap> npcMappings = npcMapRepository.findAllByMapMapId(map_id);
        List<UUID> contentIds = npcMappings.stream()
            .map(NPCMap::getContentId)
            .filter(id -> id != null)
            .distinct()
            .toList();

        Map<UUID, ContentDto> contentById = fetchContentsByIds(contentIds);

        return npcMappings
            .stream()
            .map(npcMap -> {
                NPC npc = npcMap.getNpc();
                ContentDto c = npcMap.getContentId() == null ? null : contentById.get(npcMap.getContentId());
                
                // Only return approved content or just assume it is approved
                if (c == null || !"APPROVED".equals(c.status())) {
                    return null; // or skip
                }
                
                return new NPCMapLessonResponse(
                    npc.getNpcId(),
                    npc.getName(),
                    npc.getAsset(),
                    c.contentId(),
                    c.title(),
                    c.body(),
                    c.topicId(),
                    c.topicName(),
                    c.videoUrl(),
                    c.averageRating(),
                    c.ratingCount(),
                    null
                );
            })
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toList());
    }

    private Map<UUID, ContentDto> fetchContentsByIds(List<UUID> contentIds) {
        if (contentIds == null || contentIds.isEmpty()) return java.util.Map.of();

        try {
            String url = learningServiceUrl + "/api/internal/contents/batch";
            ContentDto[] rows = restTemplate.postForObject(url, contentIds, ContentDto[].class);
            if (rows == null || rows.length == 0) return java.util.Map.of();

            return java.util.Arrays.stream(rows)
                .filter(content -> content != null && content.contentId() != null)
                .collect(Collectors.toMap(ContentDto::contentId, content -> content, (first, second) -> first));
        } catch (Exception e) {
            System.err.println("Failed to fetch content batch for NPC map load: " + e.getMessage());
            return java.util.Map.of();
        }
    }

    public NPC saveNPC(NPC npc) {
        return repository.save(npc);
    }

    public NPCMap assignContent(NPCMapAssignRequest request) {
        NPC npc = repository.findById(request.npcId())
            .orElseThrow(() -> new RuntimeException("NPC not found: " + request.npcId()));
        com.smu.csd.maps.Map map = mapRepository.findById(request.mapId())
            .orElseThrow(() -> new RuntimeException("Map not found: " + request.mapId()));
        
        // Verify content exists via internal API
        try {
            String url = learningServiceUrl + "/api/internal/contents/" + request.contentId();
            ContentDto content = restTemplate.getForObject(url, ContentDto.class);
            if (content == null) throw new RuntimeException("Content not found");
        } catch (Exception e) {
            throw new RuntimeException("Content not found or unavailable: " + request.contentId());
        }

        NPCMap npcMap = NPCMap.builder()
            .npc(npc)
            .map(map)
            .contentId(request.contentId())
            .build();
        return npcMapRepository.save(npcMap);
    }

    public NPC updateNPC(UUID npc_id, NPC npc) {
        return repository.findById(npc_id).map(current -> {
            current.setName(npc.getName());
            current.setAsset(npc.getAsset());
            return repository.save(current);
        }).orElseThrow(() -> new RuntimeException("NPC not found"));
    }

    public void deleteNPC(UUID npc_id) {
        repository.deleteById(npc_id);  
    }
}
