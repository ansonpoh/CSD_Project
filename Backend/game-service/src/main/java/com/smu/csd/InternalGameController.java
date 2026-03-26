package com.smu.csd;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.NPCService;
import com.smu.csd.encounters.EncounterService;
import com.smu.csd.monsters.MonsterService;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;
import com.smu.csd.npcs.npc_map.NPCMapAssignRequest;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalGameController {

    private final MapRepository mapRepository;
    private final NPCService npcService;
    private final EncounterService encounterService;
    private final MonsterService monsterService;

    @GetMapping("/maps/{mapId}")
    public ResponseEntity<Map<String, Object>> getMapById(@PathVariable UUID mapId) {
        return mapRepository.findById(mapId).map((com.smu.csd.maps.Map m) -> {
            return ResponseEntity.ok(Map.<String, Object>of(
                "mapId", m.getMapId(),
                "name", m.getName()
            ));
        }).orElseGet(() -> ResponseEntity.notFound().<Map<String, Object>>build());
    }

    @GetMapping("/maps/{mapId}/contents")
    public ResponseEntity<List<Map<String, Object>>> getMapContents(@PathVariable UUID mapId) {
        List<NPCMapLessonResponse> npcs = npcService.getNPCsByMapId(mapId);
        List<Map<String, Object>> response = npcs.stream()
            .filter(n -> n.contentId() != null)
            .map(n -> {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("npcName", n.name());
                m.put("contentTitle", n.contentTitle());
                m.put("contentBody", n.contentBody());
                return m;
            }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/npc-maps")
    public ResponseEntity<?> assignContent(@RequestBody NPCMapAssignRequest request) {
        try {
            return ResponseEntity.ok(npcService.assignContent(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/encounters/all-npcs-completed")
    public ResponseEntity<Boolean> hasAllNpcsCompleted(
        @org.springframework.web.bind.annotation.RequestParam UUID learnerId,
        @org.springframework.web.bind.annotation.RequestParam UUID mapId
    ) {
        return ResponseEntity.ok(encounterService.hasAllNpcsCompletedOnMap(learnerId, mapId));
    }

    @GetMapping("/monsters/{monsterId}")
    public ResponseEntity<Map<String, Object>> getMonsterById(@PathVariable UUID monsterId) {
        try {
            var monster = monsterService.getMonsterById(monsterId);
            return ResponseEntity.ok(Map.of(
                "monsterId", monster.getMonsterId(),
                "name", monster.getName() != null ? monster.getName() : "monster"
            ));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
