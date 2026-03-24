package com.smu.csd.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.likes.MapLike;
import com.smu.csd.maps.likes.MapLikeCountProjection;
import com.smu.csd.maps.likes.MapLikeRepository;
import com.smu.csd.maps.ratings.MapRating;
import com.smu.csd.maps.ratings.MapRatingRepository;
import com.smu.csd.maps.ratings.MapRatingSummaryProjection;
import com.smu.csd.roles.Administrator;
import com.smu.csd.roles.AdministratorRepository;
import com.smu.csd.roles.Contributor;
import com.smu.csd.roles.ContributorRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDateTime;
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
    private final MapDraftRepository mapDraftRepository;
    private final MapSubmissionRepository mapSubmissionRepository;
    private final MapLikeRepository mapLikeRepository;
    private final MapRatingRepository mapRatingRepository;
    private final RestTemplate restTemplate;
    private final EntityManager entityManager;
    private final ContributorRepository contributorRepository;
    private final AdministratorRepository administratorRepository;
    private final ObjectMapper objectMapper;

    @Value("${player.url:http://player-service:8084}")
    private String playerServiceUrl;
    @Value("${learning.url:http://learning-service:8083}")
    private String learningServiceUrl;

    public MapService(
            MapRepository repository,
            MapDraftRepository mapDraftRepository,
            MapSubmissionRepository mapSubmissionRepository,
            MapLikeRepository mapLikeRepository,
            MapRatingRepository mapRatingRepository,
            RestTemplate restTemplate,
            EntityManager entityManager,
            ContributorRepository contributorRepository,
            AdministratorRepository administratorRepository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.mapDraftRepository = mapDraftRepository;
        this.mapSubmissionRepository = mapSubmissionRepository;
        this.mapLikeRepository = mapLikeRepository;
        this.mapRatingRepository = mapRatingRepository;
        this.restTemplate = restTemplate;
        this.entityManager = entityManager;
        this.contributorRepository = contributorRepository;
        this.administratorRepository = administratorRepository;
        this.objectMapper = objectMapper;
    }

    //Get requests
    public List<Map> getAllMaps(boolean includeUnpublished) {
        if (includeUnpublished) {
            return repository.findAll();
        }
        return repository.findByPublishedTrueOrPublishedIsNull();
    }

    public List<MapCatalogResponse> getMapCatalog(UUID supabaseUserId, boolean includeUnpublished) {
        List<Map> maps = getAllMaps(includeUnpublished);
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

    public Optional<Map> getMapById(UUID mapId) {
        return repository.findById(mapId);
    }

    public List<Map> getMapsByWorldId(UUID worldId) {
        return repository.findByWorld_worldId(worldId);
    }

    public List<Map> getReviewQueue() {
        return repository.findByStatusOrderByMapIdAsc(Map.Status.PENDING_REVIEW);
    }

    public List<Map> getApprovedUnpublishedMaps() {
        return repository.findByStatusAndPublishedFalseOrderByMapIdAsc(Map.Status.APPROVED);
    }

    public List<Map> getContributorSubmissions(UUID contributorSupabaseUserId) {
        UUID contributorId = requireContributorIdBySupabase(contributorSupabaseUserId);
        return repository.findBySubmittedByContributor_ContributorIdOrderByMapIdAsc(contributorId);
    }

    public List<MapSubmissionResponse> getContributorSubmissionResponses(UUID contributorSupabaseUserId) {
        return getContributorSubmissions(contributorSupabaseUserId).stream()
                .map(this::toSubmissionResponse)
                .toList();
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
        if (map.getStatus() == null) {
            map.setStatus(Map.Status.APPROVED);
        }
        if (map.getPublished() == null) {
            map.setPublished(Boolean.TRUE);
        }
        if (Boolean.TRUE.equals(map.getPublished()) && map.getPublishedAt() == null) {
            map.setPublishedAt(LocalDateTime.now());
        }
        return repository.save(map);
    }

    @Transactional
    public MapEditorDraftStore.DraftRecord saveDraft(UUID ownerSupabaseUserId, MapEditorDraftStore.SaveDraftRequest request) {
        UUID contributorId = requireContributorIdBySupabase(ownerSupabaseUserId);
        Instant now = Instant.now();

        MapDraft draft;
        if (request.draftId() != null) {
            draft = mapDraftRepository.findById(request.draftId())
                    .orElseThrow(() -> new IllegalArgumentException("Map draft not found."));
            UUID ownerId = draft.getContributor() == null ? null : draft.getContributor().getContributorId();
            if (!contributorId.equals(ownerId)) {
                throw new IllegalArgumentException("You do not own this draft.");
            }
        } else {
            draft = new MapDraft();
            draft.setContributor(entityManager.getReference(Contributor.class, contributorId));
            draft.setCreatedAt(now);
        }

        draft.setName(safe(request.name(), "Untitled Draft"));
        draft.setDescription(safe(request.description(), ""));
        draft.setBiome(safe(request.biome(), ""));
        draft.setDifficulty(safe(request.difficulty(), ""));
        draft.setMapData(toJsonNode(request.mapData()));
        draft.setUpdatedAt(now);

        MapDraft savedDraft = mapDraftRepository.save(draft);
        UUID publishedMapId = latestSubmittedMapId(savedDraft.getMapDraftId(), contributorId);
        return toDraftRecord(savedDraft, ownerSupabaseUserId, publishedMapId);
    }

    public List<MapEditorDraftStore.DraftSummary> listDrafts(UUID ownerSupabaseUserId) {
        UUID contributorId = requireContributorIdBySupabase(ownerSupabaseUserId);
        return mapDraftRepository.findByContributor_ContributorIdOrderByUpdatedAtDesc(contributorId).stream()
                .map(draft -> {
                    UUID publishedMapId = latestSubmittedMapId(draft.getMapDraftId(), contributorId);
                    return new MapEditorDraftStore.DraftSummary(
                            draft.getMapDraftId(),
                            safe(draft.getName(), "Untitled Draft"),
                            safe(draft.getDescription(), ""),
                            draft.getUpdatedAt(),
                            publishedMapId != null,
                            publishedMapId
                    );
                })
                .toList();
    }

    public MapEditorDraftStore.DraftRecord getDraft(UUID ownerSupabaseUserId, UUID draftId) throws ResourceNotFoundException {
        UUID contributorId = requireContributorIdBySupabase(ownerSupabaseUserId);
        MapDraft draft = mapDraftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("MapDraft", "draftId", draftId));

        UUID ownerId = draft.getContributor() == null ? null : draft.getContributor().getContributorId();
        if (!contributorId.equals(ownerId)) {
            throw new ResourceNotFoundException("MapDraft", "draftId", draftId);
        }

        UUID publishedMapId = latestSubmittedMapId(draftId, contributorId);
        return toDraftRecord(draft, ownerSupabaseUserId, publishedMapId);
    }

    @Transactional
    public Map submitDraft(UUID ownerSupabaseUserId, UUID draftId, MapEditorDraftStore.PublishDraftRequest request)
            throws ResourceNotFoundException {
        UUID contributorId = requireContributorIdBySupabase(ownerSupabaseUserId);
        MapDraft draft = mapDraftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("MapDraft", "draftId", draftId));

        UUID ownerId = draft.getContributor() == null ? null : draft.getContributor().getContributorId();
        if (!contributorId.equals(ownerId)) {
            throw new ResourceNotFoundException("MapDraft", "draftId", draftId);
        }

        Map map = mapSubmissionRepository
                .findTopByMapDraft_MapDraftIdAndContributor_ContributorIdOrderBySubmittedAtDescCreatedAtDesc(draftId, contributorId)
                .map(MapSubmission::getMap)
                .orElseGet(Map::new);

        String mapName = request.name() == null || request.name().isBlank() ? draft.getName() : request.name().trim();
        String description = request.description() == null || request.description().isBlank()
                ? draft.getDescription()
                : request.description().trim();

        map.setName(safe(mapName, "Untitled Contributor Map"));
        map.setDescription(safe(description, ""));
        map.setAsset("editor-draft:" + draftId);
        map.setSubmittedByContributor(entityManager.getReference(Contributor.class, contributorId));
        map.setStatus(Map.Status.PENDING_REVIEW);
        map.setRejectionReason(null);
        map.setApprovedAt(null);
        map.setApprovedByAdmin(null);
        map.setPublished(Boolean.FALSE);
        map.setPublishedAt(null);
        map.setPublishedByAdmin(null);
        map.setTopic(null);

        Map savedMap = repository.save(map);
        Instant now = Instant.now();
        mapSubmissionRepository.save(MapSubmission.builder()
                .map(savedMap)
                .mapDraft(draft)
                .contributor(entityManager.getReference(Contributor.class, contributorId))
                .name(savedMap.getName())
                .description(savedMap.getDescription())
                .mapData(draft.getMapData())
                .createdAt(now)
                .submittedAt(now)
                .build());
        return savedMap;
    }

    @Transactional
    public Map approveMap(UUID mapId, UUID adminSupabaseUserId) {
        UUID administratorId = requireAdministratorIdBySupabase(adminSupabaseUserId);
        Map map = requireMap(mapId);
        if (map.getStatus() != Map.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW maps can be approved.");
        }

        map.setStatus(Map.Status.APPROVED);
        map.setRejectionReason(null);
        map.setApprovedByAdmin(entityManager.getReference(Administrator.class, administratorId));
        map.setApprovedAt(LocalDateTime.now());
        map.setPublished(Boolean.FALSE);
        map.setPublishedAt(null);
        map.setPublishedByAdmin(null);
        map.setTopic(null);
        return repository.save(map);
    }

    @Transactional
    public Map rejectMap(UUID mapId, UUID adminSupabaseUserId, String reason) {
        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("Rejection reason is required.");
        }

        Map map = requireMap(mapId);
        if (map.getStatus() != Map.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW maps can be rejected.");
        }

        map.setStatus(Map.Status.REJECTED);
        map.setRejectionReason(reason.trim());
        map.setApprovedByAdmin(null);
        map.setApprovedAt(null);
        map.setPublished(Boolean.FALSE);
        map.setPublishedAt(null);
        map.setPublishedByAdmin(null);
        map.setTopic(null);
        return repository.save(map);
    }

    @Transactional
    public Map publishApprovedMap(UUID mapId, UUID adminSupabaseUserId, UUID topicId) {
        UUID administratorId = requireAdministratorIdBySupabase(adminSupabaseUserId);
        if (topicId == null) {
            throw new IllegalArgumentException("topicId is required.");
        }
        requireTopicExists(topicId);

        Map map = requireMap(mapId);
        if (map.getStatus() != Map.Status.APPROVED) {
            throw new IllegalStateException("Only APPROVED maps can be published.");
        }

        map.setPublished(Boolean.TRUE);
        map.setTopic(entityManager.getReference(Topic.class, topicId));
        map.setPublishedByAdmin(entityManager.getReference(Administrator.class, administratorId));
        map.setPublishedAt(LocalDateTime.now());
        return repository.save(map);
    }

    public Object getEditorRuntimeData(UUID mapId) throws ResourceNotFoundException {
        Map map = repository.findById(mapId)
                .orElseThrow(() -> new ResourceNotFoundException("Map", "mapId", mapId));

        Optional<MapSubmission> latestSnapshot = mapSubmissionRepository
                .findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(mapId);
        if (latestSnapshot.isPresent()) {
            return fromJsonNode(latestSnapshot.get().getMapData());
        }

        String asset = map.getAsset();
        if (asset != null && asset.startsWith("editor-draft:")) {
            UUID draftId = UUID.fromString(asset.substring("editor-draft:".length()));
            Optional<MapDraft> draft = mapDraftRepository.findById(draftId);
            if (draft.isPresent()) {
                return fromJsonNode(draft.get().getMapData());
            }
        }

        HashMap<String, Object> response = new HashMap<>();
        response.put("previewUnavailable", true);
        response.put("reason", "No submission snapshot found for this map.");
        response.put("mapId", mapId);
        return response;
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
                map.getStatus() == null ? null : map.getStatus().name(),
                Boolean.TRUE.equals(map.getPublished()),
                map.getTopic() == null ? null : map.getTopic().getTopicId(),
                map.getSubmittedByContributor() == null ? null : map.getSubmittedByContributor().getContributorId(),
                map.getRejectionReason(),
                map.getApprovedByAdmin() == null ? null : map.getApprovedByAdmin().getAdministratorId(),
                map.getApprovedAt(),
                map.getPublishedByAdmin() == null ? null : map.getPublishedByAdmin().getAdministratorId(),
                map.getPublishedAt(),
                averageRating,
                ratingCount,
                likeCount,
                currentUserRating,
                currentUserLiked
        );
    }

    private MapSubmissionResponse toSubmissionResponse(Map map) {
        return new MapSubmissionResponse(
                map.getMapId(),
                map.getName(),
                map.getDescription(),
                map.getAsset(),
                map.getStatus() == null ? null : map.getStatus().name(),
                Boolean.TRUE.equals(map.getPublished()),
                map.getTopic() == null ? null : map.getTopic().getTopicId(),
                map.getTopic() == null ? null : map.getTopic().getTopicName(),
                map.getSubmittedByContributor() == null ? null : map.getSubmittedByContributor().getContributorId(),
                map.getRejectionReason(),
                map.getApprovedByAdmin() == null ? null : map.getApprovedByAdmin().getAdministratorId(),
                map.getApprovedAt(),
                map.getPublishedByAdmin() == null ? null : map.getPublishedByAdmin().getAdministratorId(),
                map.getPublishedAt()
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

    private UUID requireContributorIdBySupabase(UUID supabaseUserId) {
        if (supabaseUserId == null) {
            throw new IllegalArgumentException("Contributor user id is required.");
        }
        return contributorRepository.findBySupabaseUserId(supabaseUserId)
                .map(Contributor::getContributorId)
                .orElseThrow(() -> new IllegalStateException("Contributor profile not found for current user."));
    }

    private UUID requireAdministratorIdBySupabase(UUID supabaseUserId) {
        if (supabaseUserId == null) {
            throw new IllegalArgumentException("Administrator user id is required.");
        }
        return administratorRepository.findBySupabaseUserId(supabaseUserId)
                .map(Administrator::getAdministratorId)
                .orElseThrow(() -> new IllegalStateException("Administrator profile not found for current user."));
    }

    private void requireTopicExists(UUID topicId) {
        try {
            String url = learningServiceUrl + "/api/internal/topics/" + topicId;
            TopicLookupResponse topic = restTemplate.getForObject(url, TopicLookupResponse.class);
            if (topic == null || topic.topicId() == null) {
                throw new IllegalArgumentException("Topic not found in learning-service.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Topic not found in learning-service.");
        }
    }

    private UUID latestSubmittedMapId(UUID draftId, UUID contributorId) {
        return mapSubmissionRepository
                .findTopByMapDraft_MapDraftIdAndContributor_ContributorIdOrderBySubmittedAtDescCreatedAtDesc(draftId, contributorId)
                .map(MapSubmission::getMap)
                .map(Map::getMapId)
                .orElse(null);
    }

    private MapEditorDraftStore.DraftRecord toDraftRecord(MapDraft draft, UUID ownerSupabaseUserId, UUID publishedMapId) {
        return new MapEditorDraftStore.DraftRecord(
                draft.getMapDraftId(),
                ownerSupabaseUserId,
                safe(draft.getName(), "Untitled Draft"),
                safe(draft.getDescription(), ""),
                safe(draft.getBiome(), ""),
                safe(draft.getDifficulty(), ""),
                fromJsonNode(draft.getMapData()),
                draft.getCreatedAt(),
                draft.getUpdatedAt(),
                publishedMapId != null,
                publishedMapId
        );
    }

    private JsonNode toJsonNode(Object payload) {
        return objectMapper.valueToTree(payload == null ? java.util.Map.of() : payload);
    }

    private Object fromJsonNode(JsonNode node) {
        if (node == null || node.isNull()) return java.util.Map.of();
        return objectMapper.convertValue(node, Object.class);
    }

    private String safe(String value, String fallback) {
        if (value == null) return fallback;
        String trimmed = value.trim();
        return trimmed.isBlank() ? fallback : trimmed;
    }

    private record TopicLookupResponse(UUID topicId, String topicName, String description) {}
}
