package com.smu.csd.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.smu.csd.exception.ResourceNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;



@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/maps")
public class MapController {
    private final MapService service;

    public MapController(MapService service) {
        this.service = service;
    }

    @GetMapping("/{map_id}")
    public Optional<Map> getMapById(@PathVariable UUID map_id) {
        return service.getMapById(map_id);
    }

    @GetMapping("/all")
    public List<Map> getAllMaps() {
        return service.getAllMaps();
    }

    @GetMapping("/world/{world_id}")
    public List<Map> getMapsByWorldId(@PathVariable("world_id") UUID world_id) {
        return service.getMapsByWorldId(world_id);
    }
    

    
    @PostMapping("/add")
    public Map addMap(@RequestBody Map map) {
        return service.saveMap(map);
    }

    @GetMapping("/editor/drafts/me")
    public List<MapEditorDraftStore.DraftSummary> getMyDrafts(Authentication authentication) {
        UUID supabaseUserId = currentUser(authentication);
        return service.listDrafts(supabaseUserId);
    }

    @GetMapping("/editor/drafts/{draftId}")
    public MapEditorDraftStore.DraftRecord getMyDraft(
            Authentication authentication,
            @PathVariable UUID draftId
    ) throws ResourceNotFoundException {
        UUID supabaseUserId = currentUser(authentication);
        return service.getDraft(supabaseUserId, draftId);
    }

    @PostMapping("/editor/drafts")
    public MapEditorDraftStore.DraftRecord saveDraft(
            Authentication authentication,
            @RequestBody MapEditorDraftStore.SaveDraftRequest request
    ) {
        UUID supabaseUserId = currentUser(authentication);
        return service.saveDraft(supabaseUserId, request);
    }

    @PostMapping("/editor/drafts/{draftId}/publish")
    public Map publishDraft(
            Authentication authentication,
            @PathVariable UUID draftId,
            @RequestBody(required = false) MapEditorDraftStore.PublishDraftRequest request
    ) throws ResourceNotFoundException {
        UUID supabaseUserId = currentUser(authentication);
        MapEditorDraftStore.PublishDraftRequest payload =
                request == null ? new MapEditorDraftStore.PublishDraftRequest(null, null) : request;
        return service.publishDraft(supabaseUserId, draftId, payload);
    }

    @GetMapping("/editor-data/{mapId}")
    public ResponseEntity<JsonNode> getEditorRuntimeData(@PathVariable UUID mapId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getEditorRuntimeData(mapId));
    }

    private UUID currentUser(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
