package com.smu.csd.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.smu.csd.exception.ResourceNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class MapService {
    private final MapRepository repository;
    private final MapEditorDraftStore draftStore;

    public MapService(MapRepository repository, MapEditorDraftStore draftStore) {
        this.repository = repository;
        this.draftStore = draftStore;
    }

    //Get requests
    public List<Map> getAllMaps() {
        return repository.findAll();
    }

    public Optional<Map> getMapById(UUID map_id) {
        return repository.findById(map_id);
    }

    public List<Map> getMapsByWorldId(UUID world_id) {
        return repository.findByWorld_worldId(world_id);
    }

    //Post requests
    public Map saveMap(Map map) {
        return repository.save(map);
    }

    public MapEditorDraftStore.DraftRecord saveDraft(UUID ownerSupabaseUserId, MapEditorDraftStore.SaveDraftRequest request) {
        return draftStore.save(ownerSupabaseUserId, request);
    }

    public List<MapEditorDraftStore.DraftSummary> listDrafts(UUID ownerSupabaseUserId) {
        return draftStore.listMine(ownerSupabaseUserId);
    }

    public MapEditorDraftStore.DraftRecord getDraft(UUID ownerSupabaseUserId, UUID draftId) throws ResourceNotFoundException {
        return draftStore.getMine(ownerSupabaseUserId, draftId);
    }

    public Map publishDraft(UUID ownerSupabaseUserId, UUID draftId, MapEditorDraftStore.PublishDraftRequest request)
            throws ResourceNotFoundException {
        MapEditorDraftStore.DraftRecord draft = draftStore.getMine(ownerSupabaseUserId, draftId);

        Map map;
        if (draft.published() && draft.publishedMapId() != null) {
            map = repository.findById(draft.publishedMapId())
                    .orElseGet(Map::new);
        } else {
            map = new Map();
        }

        String mapName = request.name() == null || request.name().isBlank() ? draft.name() : request.name().trim();
        String description = request.description() == null || request.description().isBlank()
                ? draft.description()
                : request.description().trim();

        map.setName(mapName.isBlank() ? "Untitled Contributor Map" : mapName);
        map.setDescription(description);
        map.setAsset("editor-draft:" + draftId);
        Map saved = repository.save(map);
        draftStore.markPublished(draftId, saved.getMapId());
        return saved;
    }

    public JsonNode getEditorRuntimeData(UUID mapId) throws ResourceNotFoundException {
        Map map = repository.findById(mapId)
                .orElseThrow(() -> new ResourceNotFoundException("Map", "mapId", mapId));

        String asset = map.getAsset();
        if (asset == null || !asset.startsWith("editor-draft:")) {
            throw new IllegalArgumentException("Map is not an editor-published map");
        }

        UUID draftId = UUID.fromString(asset.substring("editor-draft:".length()));
        MapEditorDraftStore.DraftRecord draft = draftStore.getAny(draftId);
        return draft.mapData();
    }
}
