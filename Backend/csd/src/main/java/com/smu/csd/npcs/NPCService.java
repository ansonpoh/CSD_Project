package com.smu.csd.npcs;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import javax.management.RuntimeErrorException;

public class NPCService {
    private final NPCRepository repository;

    public NPCService(NPCRepository repository) {
        this.repository = repository;
    }

    //Get requests
    public List<NPC> getAllNPCs() {
        return repository.findAll();
    }

    public Optional<NPC> getNPCById(UUID npc_id) {
        return repository.findById(npc_id);
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
