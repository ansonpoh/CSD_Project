package com.smu.csd.maps;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.likes.MapLikeRequest;
import com.smu.csd.maps.ratings.MapRatingRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    public List<MapCatalogResponse> getAllMaps(Authentication authentication) {
        boolean includeUnpublished = hasRole(authentication, "ROLE_ADMIN");
        return service.getMapCatalog(currentUser(authentication), includeUnpublished);
    }

    @GetMapping("/world/{world_id}")
    public List<Map> getMapsByWorldId(@PathVariable("world_id") UUID world_id) {
        return service.getMapsByWorldId(world_id);
    }
    

    
    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public Map addMap(@RequestBody Map map) {
        return service.saveMap(map);
    }

    @PutMapping("/{mapId}/like")
    public MapCatalogResponse updateLike(
            Authentication authentication,
            @PathVariable UUID mapId,
            @RequestBody MapLikeRequest request
    ) {
        boolean liked = request != null && Boolean.TRUE.equals(request.liked());
        return service.updateMapLike(mapId, currentUser(authentication), liked);
    }

    @PutMapping("/{mapId}/rating")
    public MapCatalogResponse updateRating(
            Authentication authentication,
            @PathVariable UUID mapId,
            @RequestBody MapRatingRequest request
    ) {
        int rating = request == null || request.rating() == null ? 0 : request.rating();
        return service.updateMapRating(mapId, currentUser(authentication), rating);
    }

    @GetMapping("/editor/drafts/me")
    @PreAuthorize("hasRole('CONTRIBUTOR') or hasRole('ADMIN')")
    public List<MapEditorDraftStore.DraftSummary> getMyDrafts(Authentication authentication) {
        UUID supabaseUserId = currentUser(authentication);
        return service.listDrafts(supabaseUserId);
    }

    @GetMapping("/editor/drafts/{draftId}")
    @PreAuthorize("hasRole('CONTRIBUTOR') or hasRole('ADMIN')")
    public MapEditorDraftStore.DraftRecord getMyDraft(
            Authentication authentication,
            @PathVariable UUID draftId
    ) throws ResourceNotFoundException {
        UUID supabaseUserId = currentUser(authentication);
        return service.getDraft(supabaseUserId, draftId);
    }

    @PostMapping("/editor/drafts")
    @PreAuthorize("hasRole('CONTRIBUTOR') or hasRole('ADMIN')")
    public MapEditorDraftStore.DraftRecord saveDraft(
            Authentication authentication,
            @RequestBody MapEditorDraftStore.SaveDraftRequest request
    ) {
        UUID supabaseUserId = currentUser(authentication);
        return service.saveDraft(supabaseUserId, request);
    }

    @PostMapping("/editor/drafts/{draftId}/submit")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public Map submitDraft(
            Authentication authentication,
            @PathVariable UUID draftId,
            @RequestBody(required = false) MapEditorDraftStore.PublishDraftRequest request
    ) throws ResourceNotFoundException {
        UUID supabaseUserId = currentUser(authentication);
        MapEditorDraftStore.PublishDraftRequest payload =
                request == null ? new MapEditorDraftStore.PublishDraftRequest(null, null) : request;
        return service.submitDraft(supabaseUserId, draftId, payload);
    }

    // Backward-compatible alias; now follows submit-for-review flow.
    @PostMapping("/editor/drafts/{draftId}/publish")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public Map submitDraftCompat(
            Authentication authentication,
            @PathVariable UUID draftId,
            @RequestBody(required = false) MapEditorDraftStore.PublishDraftRequest request
    ) throws ResourceNotFoundException {
        return submitDraft(authentication, draftId, request);
    }

    @GetMapping("/submissions/me")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public List<MapSubmissionResponse> getMySubmissions(Authentication authentication) {
        return service.getContributorSubmissionResponses(currentUser(authentication));
    }

    @GetMapping("/review/queue")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map> getReviewQueue() {
        return service.getReviewQueue();
    }

    @GetMapping("/review/approved-unpublished")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map> getApprovedUnpublishedQueue() {
        return service.getApprovedUnpublishedMaps();
    }

    @PutMapping("/{mapId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public Map approveMap(Authentication authentication, @PathVariable UUID mapId) {
        return service.approveMap(mapId, currentUser(authentication));
    }

    @PutMapping("/{mapId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public Map rejectMap(
            Authentication authentication,
            @PathVariable UUID mapId,
            @RequestBody RejectMapRequest request
    ) {
        String reason = request == null ? null : request.reason();
        return service.rejectMap(mapId, currentUser(authentication), reason);
    }

    @PutMapping("/{mapId}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public Map publishMap(
            Authentication authentication,
            @PathVariable UUID mapId,
            @RequestBody PublishMapRequest request
    ) {
        UUID topicId = request == null ? null : request.topicId();
        return service.publishApprovedMap(mapId, currentUser(authentication), topicId);
    }

    @GetMapping("/editor-data/{mapId}")
    public ResponseEntity<Object> getEditorRuntimeData(@PathVariable UUID mapId) throws ResourceNotFoundException {
        return ResponseEntity.ok(service.getEditorRuntimeData(mapId));
    }

    private UUID currentUser(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role::equals);
    }

    public record RejectMapRequest(String reason) {}
    public record PublishMapRequest(UUID topicId) {}
}
