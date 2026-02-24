package com.smu.csd.npcs;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;




@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/npcs")
public class NPCController {
    
    private final NPCService service;

    public NPCController(NPCService service) {
        this.service = service;
    }

    @GetMapping("/{npc_id}")
    public NPC getNPCById(@PathVariable UUID npc_id) {
        return service.getNPCById(npc_id);
    }

    @GetMapping("/all")
    public List<NPC> getAllNPCs() {
        return service.getAllNPCs();
    }

    @GetMapping("/map/{map_id}")
    public List<NPCMapLessonResponse> getNPCsByMap(@PathVariable UUID map_id) {
        return service.getNPCsByMapId(map_id);
    }
    

    @PostMapping("/add")
    public NPC addNpc(@Valid @RequestBody NPC npc) {
        return service.saveNPC(npc);
    }

    @PutMapping("/{npc_id}")
    public NPC updateNPC(@PathVariable UUID npc_id, @Valid @RequestBody NPC npc) {
        return service.updateNPC(npc_id, npc);
    }

    @DeleteMapping("/{npc_id}")
    public void deleteNPC(@PathVariable UUID npc_id) {
        service.deleteNPC(npc_id);
    }
    
    
    
}
