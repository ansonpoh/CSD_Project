package com.smu.csd.npcs;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.smu.csd.contents.Content;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;
import com.smu.csd.npcs.npc_map.NPCMapRepository;


import org.springframework.stereotype.Service;

@Service
public class NPCService {

    private final NPCMapRepository NPCMapRepository;
    private final NPCRepository repository;

    public NPCService(NPCRepository repository, NPCMapRepository NPCMapRepository) {
        this.NPCMapRepository = NPCMapRepository;
        this.repository = repository;
    }

    //Get requests
    public List<NPC> getAllNPCs() {
        return repository.findAll();
    }

    public NPC getNPCById(UUID npc_id) {
        return repository.findById(npc_id).orElseThrow(() -> new RuntimeException("NPC not found."));
    }

    public List<NPCMapLessonResponse> getNPCsByMapId(UUID map_id) {
        return NPCMapRepository.findAllByMapMapId(map_id)
            .stream()
            .map(npcMap -> {
                var npc = npcMap.getNpc();
                Content c = npcMap.getContent();
                return new NPCMapLessonResponse(
                    npc.getNpc_id(),
                    npc.getName(),
                    npc.getAsset(),
                    c != null ? c.getContentId() : null,
                    c != null ? c.getTitle() : null,
                    c != null ? c.getBody() : null,
                    (c != null && c.getTopic() != null) ? c.getTopic().getTopicId() : null,
                    (c != null && c.getTopic() != null) ? c.getTopic().getTopicName() : null
                );
            })
            .collect(Collectors.toList());
    }

    //Post Requests
    public NPC saveNPC(NPC npc) {
        return repository.save(npc);    
    }

    //Put Requests
    public NPC updateNPC(UUID npc_id, NPC npc) {
        return repository.findById(npc_id).map(current -> {
            current.setName(npc.getName());
            current.setAsset(npc.getAsset());
            return repository.save(current);
        }).orElseThrow(() -> new RuntimeException("NPC not found"));
    }

    //Delete Requests
    public void deleteNPC(UUID npc_id) {
        repository.deleteById(npc_id);  
    }
}
