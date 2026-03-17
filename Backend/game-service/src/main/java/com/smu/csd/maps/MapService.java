package com.smu.csd.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.likes.MapLike;
import com.smu.csd.maps.likes.MapLikeCountProjection;
import com.smu.csd.maps.likes.MapLikeRepository;
import com.smu.csd.maps.ratings.MapRating;
import com.smu.csd.maps.ratings.MapRatingRepository;
import com.smu.csd.maps.ratings.MapRatingSummaryProjection;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Service
public class MapService {
    private final MapRepository repository;
    private final MapEditorDraftStore draftStore;
    private final MapLikeRepository mapLikeRepository;
    private final MapRatingRepository mapRatingRepository;
    private final RestTemplate restTemplate;

    @Value("${player.url:http://player-service:8084}")
    private String playerServiceUrl;

    public MapService(
        MapRepository repository,
        MapEditorDraftStore draftStore,
        MapLikeRepository mapLikeRepository,
        MapRatingRepository mapRatingRepository,
        RestTemplate restTemplate
    ) {
        this.repository = repository;
        this.draftStore = draftStore;
        this.mapLikeRepository = mapLikeRepository;
        this.mapRatingRepository = mapRatingRepository;
        this.restTemplate = restTemplate;
    }

    //Get requests
    public List<Map> getAllMaps() {
        return repository.findAll();
    }

    public List<MapCatalogResponse> getMapCatalog(UUID supabaseUserId) {
        List<Map> maps = repository.findAll();
        if (maps.isEmpty()) return List.of();

        UUID learnerId = findLearnerId(supabaseUserId);
        List<UUID> mapIds = maps.stream()
                .map(Map::getMapId)
                .toList();

        java.util.Map<UUID, MapRatingSummaryProjection> ratingSummaryByMapId = indexRatings(mapRatingRepository.summarizeByMapIds(mapIds));
        java.util.Map<UUID, Long> likeCountByMapId = indexLikeCounts(mapLikeRepository.summarizeByMapIds(mapIds));
        java.util.Map<UUID, Integer> currentUserRatings = learnerId == null
                ? java.util.Map.of()
                : indexCurrentUserRatings(mapRatingRepository.findAllByLearnerIdAndMapMapIdIn(learnerId, mapIds));
        Collection<UUID> likedMapIds = learnerId == null
                ? List.of()
                : indexCurrentUserLikes(mapLikeRepository.findAllByLearnerIdAndMapMapIdIn(learnerId, mapIds));

        return maps.stream()
                .map(map -> toCatalogResponse(
                        map,
                        ratingSummaryByMapId.get(map.getMapId()),
                        likeCountByMapId.getOrDefault(map.getMapId(), 0L),
                        currentUserRatings.get(map.getMapId()),
                        likedMapIds.contains(map.getMapId())
                ))
                .toList();
    }

    public Optional<Map> getMapById(UUID map_id) {
        return repository.findById(map_id);
    }

    public List<Map> getMapsByWorldId(UUID world_id) {
        return repository.findByWorld_worldId(world_id);
    }

    @Transactional
    public MapCatalogResponse updateMapLike(UUID mapId, UUID supabaseUserId, boolean liked) {
        Map map = requireMap(mapId);
        UUID learnerId = requireLearnerId(supabaseUserId);
        List<MapLike> existing = mapLikeRepository.findAllByMapMapIdAndLearnerIdOrderByCreatedAtAsc(mapId, learnerId);

        if (liked) {
            if (existing.isEmpty()) {
                mapLikeRepository.save(MapLike.builder()
                        .map(map)
                        .learnerId(learnerId)
                        .build());
            } else if (existing.size() > 1) {
                mapLikeRepository.deleteAll(existing.subList(1, existing.size()));
            }
        } else if (!existing.isEmpty()) {
            mapLikeRepository.deleteAll(existing);
        }

        return getMapCatalogEntry(mapId, learnerId);
    }

    @Transactional
    public MapCatalogResponse updateMapRating(UUID mapId, UUID supabaseUserId, int rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }

        Map map = requireMap(mapId);
        UUID learnerId = requireLearnerId(supabaseUserId);
        List<MapRating> existing = mapRatingRepository.findAllByMapMapIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(mapId, learnerId);

        MapRating record;
        if (existing.isEmpty()) {
            record = MapRating.builder()
                    .map(map)
                    .learnerId(learnerId)
                    .build();
        } else {
            record = existing.get(0);
            if (existing.size() > 1) {
                mapRatingRepository.deleteAll(existing.subList(1, existing.size()));
            }
        }

        record.setRating(rating);
        mapRatingRepository.save(record);
        return getMapCatalogEntry(mapId, learnerId);
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

    private MapCatalogResponse getMapCatalogEntry(UUID mapId, UUID learnerId) {
        Map map = requireMap(mapId);
        MapRatingSummaryProjection ratingSummary = mapRatingRepository.summarizeByMapIds(List.of(mapId))
                .stream()
                .findFirst()
                .orElse(null);
        long likeCount = mapLikeRepository.summarizeByMapIds(List.of(mapId))
                .stream()
                .findFirst()
                .map(MapLikeCountProjection::getLikeCount)
                .orElse(0L);
        Integer currentUserRating = mapRatingRepository.findAllByLearnerIdAndMapMapIdIn(learnerId, List.of(mapId))
                .stream()
                .findFirst()
                .map(MapRating::getRating)
                .orElse(null);
        boolean currentUserLiked = !mapLikeRepository.findAllByLearnerIdAndMapMapIdIn(learnerId, List.of(mapId)).isEmpty();
        return toCatalogResponse(map, ratingSummary, likeCount, currentUserRating, currentUserLiked);
    }

    private Map requireMap(UUID mapId) {
        return repository.findById(mapId)
                .orElseThrow(() -> new IllegalArgumentException("Map not found."));
    }

    private UUID requireLearnerId(UUID supabaseUserId) {
        UUID learnerId = findLearnerId(supabaseUserId);
        if (learnerId == null) {
            throw new IllegalArgumentException("Learner profile not found for current user.");
        }
        return learnerId;
    }

    private UUID findLearnerId(UUID supabaseUserId) {
        if (supabaseUserId == null) return null;
        try {
            String url = playerServiceUrl + "/api/internal/learners/supabase/" + supabaseUserId;
            LearnerDto learner = restTemplate.getForObject(url, LearnerDto.class);
            return learner == null ? null : learner.learnerId();
        } catch (Exception e) {
            return null;
        }
    }

    private MapCatalogResponse toCatalogResponse(
        Map map,
        MapRatingSummaryProjection ratingSummary,
        long likeCount,
        Integer currentUserRating,
        boolean currentUserLiked
    ) {
        double averageRating = ratingSummary == null || ratingSummary.getAverageRating() == null
                ? 0.0
                : roundRating(ratingSummary.getAverageRating());
        long ratingCount = ratingSummary == null || ratingSummary.getRatingCount() == null
                ? 0L
                : ratingSummary.getRatingCount();

        return new MapCatalogResponse(
                map.getMapId(),
                map.getName(),
                map.getDescription(),
                map.getAsset(),
                map.getWorld() == null ? null : map.getWorld().getWorldId(),
                averageRating,
                ratingCount,
                likeCount,
                currentUserRating,
                currentUserLiked
        );
    }

    private java.util.Map<UUID, MapRatingSummaryProjection> indexRatings(List<MapRatingSummaryProjection> summaries) {
        java.util.Map<UUID, MapRatingSummaryProjection> indexed = new HashMap<>();
        for (MapRatingSummaryProjection summary : summaries) {
            if (summary == null || summary.getMapId() == null) continue;
            indexed.put(summary.getMapId(), summary);
        }
        return indexed;
    }

    private java.util.Map<UUID, Long> indexLikeCounts(List<MapLikeCountProjection> counts) {
        java.util.Map<UUID, Long> indexed = new HashMap<>();
        for (MapLikeCountProjection count : counts) {
            if (count == null || count.getMapId() == null) continue;
            indexed.put(count.getMapId(), count.getLikeCount() == null ? 0L : count.getLikeCount());
        }
        return indexed;
    }

    private java.util.Map<UUID, Integer> indexCurrentUserRatings(List<MapRating> ratings) {
        java.util.Map<UUID, Integer> indexed = new HashMap<>();
        for (MapRating rating : ratings) {
            if (rating == null || rating.getMap() == null || rating.getMap().getMapId() == null) continue;
            indexed.putIfAbsent(rating.getMap().getMapId(), rating.getRating());
        }
        return indexed;
    }

    private Collection<UUID> indexCurrentUserLikes(List<MapLike> likes) {
        return likes.stream()
                .filter(like -> like != null && like.getMap() != null && like.getMap().getMapId() != null)
                .map(like -> like.getMap().getMapId())
                .distinct()
                .toList();
    }

    private double roundRating(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
