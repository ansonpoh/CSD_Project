package com.smu.csd.maps;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.likes.MapLike;
import com.smu.csd.maps.likes.MapLikeRepository;
import com.smu.csd.maps.ratings.MapRating;
import com.smu.csd.maps.ratings.MapRatingRepository;
import com.smu.csd.roles.Administrator;
import com.smu.csd.roles.AdministratorRepository;
import com.smu.csd.roles.Contributor;
import com.smu.csd.roles.ContributorRepository;
import jakarta.persistence.EntityManager;
import java.lang.reflect.Constructor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

public class MapServiceUnitTest {

    private MapRepository repository;
    private MapDraftRepository mapDraftRepository;
    private MapSubmissionRepository mapSubmissionRepository;
    private MapLikeRepository mapLikeRepository;
    private MapRatingRepository mapRatingRepository;
    private RestTemplate restTemplate;
    private EntityManager entityManager;
    private ContributorRepository contributorRepository;
    private AdministratorRepository administratorRepository;
    private ObjectMapper objectMapper;
    private MapService mapService;

    @BeforeEach
    void setUp() {
        repository = mock(MapRepository.class);
        mapDraftRepository = mock(MapDraftRepository.class);
        mapSubmissionRepository = mock(MapSubmissionRepository.class);
        mapLikeRepository = mock(MapLikeRepository.class);
        mapRatingRepository = mock(MapRatingRepository.class);
        restTemplate = mock(RestTemplate.class);
        entityManager = mock(EntityManager.class);
        contributorRepository = mock(ContributorRepository.class);
        administratorRepository = mock(AdministratorRepository.class);
        objectMapper = new ObjectMapper();
        mapService = new MapService(
                repository,
                mapDraftRepository,
                mapSubmissionRepository,
                mapLikeRepository,
                mapRatingRepository,
                restTemplate,
                entityManager,
                contributorRepository,
                administratorRepository,
                objectMapper
        );
    }

    @Test
    void getAllMaps_ReturnsAllMapsWhenIncludingUnpublished() {
        Map first = Map.builder().mapId(UUID.randomUUID()).name("First").build();
        Map second = Map.builder().mapId(UUID.randomUUID()).name("Second").build();
        when(repository.findAll()).thenReturn(List.of(first, second));

        List<Map> result = mapService.getAllMaps(true);

        assertEquals(2, result.size());
        assertEquals("First", result.get(0).getName());
        verify(repository).findAll();
    }

    @Test
    void getAllMaps_ReturnsPublishedOnlyWhenExcludingUnpublished() {
        Map published = Map.builder().mapId(UUID.randomUUID()).name("Published").published(true).build();
        when(repository.findByPublishedTrueOrPublishedIsNull()).thenReturn(List.of(published));

        List<Map> result = mapService.getAllMaps(false);

        assertEquals(1, result.size());
        assertEquals("Published", result.get(0).getName());
        verify(repository).findByPublishedTrueOrPublishedIsNull();
    }

    @Test
    void updateMapLike_InsertsLikeWhenMissing() {
        UUID mapId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).name("Map").build();

        stubLearner(supabaseUserId, learnerId);
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapLikeRepository.findAllByMapMapIdAndLearnerIdOrderByCreatedAtAsc(mapId, learnerId)).thenReturn(List.of());
        stubEmptyCatalog(learnerId);
        when(mapLikeRepository.save(any(MapLike.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MapCatalogResponse response = mapService.updateMapLike(mapId, supabaseUserId, true);

        assertEquals(mapId, response.mapId());
        verify(mapLikeRepository).save(argThat(like -> like != null
                && like.getMap() != null
                && mapId.equals(like.getMap().getMapId())
                && learnerId.equals(like.getLearnerId())));
        verify(mapLikeRepository, never()).deleteAll(anyList());
    }

    @Test
    void updateMapLike_PrunesDuplicateLikeRows() {
        UUID mapId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).name("Map").build();
        MapLike first = MapLike.builder().map(map).learnerId(learnerId).build();
        MapLike second = MapLike.builder().map(map).learnerId(learnerId).build();
        MapLike third = MapLike.builder().map(map).learnerId(learnerId).build();

        stubLearner(supabaseUserId, learnerId);
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapLikeRepository.findAllByMapMapIdAndLearnerIdOrderByCreatedAtAsc(mapId, learnerId)).thenReturn(List.of(first, second, third));
        stubEmptyCatalog(learnerId);

        MapCatalogResponse response = mapService.updateMapLike(mapId, supabaseUserId, true);

        assertEquals(mapId, response.mapId());
        verify(mapLikeRepository).deleteAll(argThat(list -> {
            int count = 0;
            for (Object ignored : list) {
                count += 1;
            }
            return count == 2;
        }));
        verify(mapLikeRepository, never()).save(any(MapLike.class));
    }

    @Test
    void updateMapLike_RemovesExistingLikesWhenUnliked() {
        UUID mapId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).name("Map").build();
        MapLike first = MapLike.builder().map(map).learnerId(learnerId).build();
        MapLike second = MapLike.builder().map(map).learnerId(learnerId).build();
        List<MapLike> existing = List.of(first, second);

        stubLearner(supabaseUserId, learnerId);
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapLikeRepository.findAllByMapMapIdAndLearnerIdOrderByCreatedAtAsc(mapId, learnerId)).thenReturn(existing);
        stubEmptyCatalog(learnerId);

        MapCatalogResponse response = mapService.updateMapLike(mapId, supabaseUserId, false);

        assertEquals(mapId, response.mapId());
        verify(mapLikeRepository).deleteAll(existing);
        verify(mapLikeRepository, never()).save(any(MapLike.class));
    }

    @Test
    void updateMapRating_RejectsOutOfBoundsRatings() {
        UUID mapId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> mapService.updateMapRating(mapId, supabaseUserId, 0));
        assertThrows(IllegalArgumentException.class, () -> mapService.updateMapRating(mapId, supabaseUserId, 6));
    }

    @Test
    void updateMapRating_CreatesNewRatingRowWhenAbsent() {
        UUID mapId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).name("Map").build();

        stubLearner(supabaseUserId, learnerId);
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapRatingRepository.findAllByMapMapIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(mapId, learnerId)).thenReturn(List.of());
        stubEmptyCatalog(learnerId);
        when(mapRatingRepository.save(any(MapRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MapCatalogResponse response = mapService.updateMapRating(mapId, supabaseUserId, 4);

        assertEquals(mapId, response.mapId());
        verify(mapRatingRepository).save(argThat(row -> row != null
                && row.getMap() != null
                && mapId.equals(row.getMap().getMapId())
                && learnerId.equals(row.getLearnerId())
                && Integer.valueOf(4).equals(row.getRating())));
    }

    @Test
    void updateMapRating_DeduplicatesExtraRowsWhenMultipleExist() {
        UUID mapId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).name("Map").build();
        MapRating first = MapRating.builder().map(map).learnerId(learnerId).rating(2).build();
        MapRating second = MapRating.builder().map(map).learnerId(learnerId).rating(3).build();
        MapRating third = MapRating.builder().map(map).learnerId(learnerId).rating(4).build();

        stubLearner(supabaseUserId, learnerId);
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapRatingRepository.findAllByMapMapIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(mapId, learnerId)).thenReturn(List.of(first, second, third));
        stubEmptyCatalog(learnerId);
        when(mapRatingRepository.save(any(MapRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MapCatalogResponse response = mapService.updateMapRating(mapId, supabaseUserId, 5);

        assertEquals(mapId, response.mapId());
        verify(mapRatingRepository).deleteAll(argThat(list -> {
            int count = 0;
            for (Object ignored : list) {
                count += 1;
            }
            return count == 2;
        }));
        verify(mapRatingRepository).save(argThat(row -> row != null
                && row.getMap() != null
                && mapId.equals(row.getMap().getMapId())
                && learnerId.equals(row.getLearnerId())
                && Integer.valueOf(5).equals(row.getRating())));
    }

    @Test
    void saveMap_AppliesDefaultsForStatusPublishedAndPublishedAt() {
        Map map = new Map();
        map.setMapId(UUID.randomUUID());
        map.setName("Draft");
        map.setStatus(null);
        map.setPublished(null);
        map.setPublishedAt(null);
        when(repository.save(any(Map.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map saved = mapService.saveMap(map);

        assertEquals(Map.Status.APPROVED, saved.getStatus());
        assertTrue(saved.getPublished());
        assertNotNull(saved.getPublishedAt());
    }

    @Test
    void saveDraft_RejectsDraftUpdatesFromNonOwners() {
        UUID ownerSupabaseUserId = UUID.randomUUID();
        UUID currentContributorId = UUID.randomUUID();
        UUID draftOwnerId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();

        Contributor currentContributor = Contributor.builder().contributorId(currentContributorId).build();
        Contributor draftOwner = Contributor.builder().contributorId(draftOwnerId).build();
        MapDraft draft = MapDraft.builder().mapDraftId(draftId).contributor(draftOwner).build();

        when(contributorRepository.findBySupabaseUserId(ownerSupabaseUserId)).thenReturn(Optional.of(currentContributor));
        when(mapDraftRepository.findById(draftId)).thenReturn(Optional.of(draft));

        MapEditorDraftStore.SaveDraftRequest request = new MapEditorDraftStore.SaveDraftRequest(
                draftId,
                "Name",
                "Desc",
                "Biome",
                "Difficulty",
                null
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> mapService.saveDraft(ownerSupabaseUserId, request)
        );

        assertEquals("You do not own this draft.", exception.getMessage());
        verify(mapDraftRepository, never()).save(any(MapDraft.class));
    }

    @Test
    void submitDraft_RejectsNonOwnerAccess() {
        UUID ownerSupabaseUserId = UUID.randomUUID();
        UUID currentContributorId = UUID.randomUUID();
        UUID draftOwnerId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();

        Contributor currentContributor = Contributor.builder().contributorId(currentContributorId).build();
        Contributor draftOwner = Contributor.builder().contributorId(draftOwnerId).build();
        MapDraft draft = MapDraft.builder().mapDraftId(draftId).contributor(draftOwner).build();

        when(contributorRepository.findBySupabaseUserId(ownerSupabaseUserId)).thenReturn(Optional.of(currentContributor));
        when(mapDraftRepository.findById(draftId)).thenReturn(Optional.of(draft));

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> mapService.submitDraft(ownerSupabaseUserId, draftId, new MapEditorDraftStore.PublishDraftRequest(null, null))
        );

        assertEquals("MapDraft not found with draftId: " + draftId, exception.getMessage());
        verify(repository, never()).save(any(Map.class));
    }

    @Test
    void approveMap_RejectsNonPendingReviewMaps() {
        UUID adminSupabaseUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        Administrator admin = Administrator.builder().administratorId(adminId).build();
        Map map = Map.builder().mapId(mapId).status(Map.Status.APPROVED).build();

        when(administratorRepository.findBySupabaseUserId(adminSupabaseUserId)).thenReturn(Optional.of(admin));
        when(repository.findById(mapId)).thenReturn(Optional.of(map));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> mapService.approveMap(mapId, adminSupabaseUserId)
        );

        assertEquals("Only PENDING_REVIEW maps can be approved.", exception.getMessage());
        verify(repository, never()).save(any(Map.class));
    }

    @Test
    void rejectMap_RequiresNonBlankReason() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> mapService.rejectMap(UUID.randomUUID(), UUID.randomUUID(), "   ")
        );

        assertEquals("Rejection reason is required.", exception.getMessage());
    }

    @Test
    void publishApprovedMap_PublishesWhenTopicIsValidAndMapIsApproved() {
        UUID adminSupabaseUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        Administrator admin = Administrator.builder().administratorId(adminId).build();
        Topic topic = Topic.builder().topicId(topicId).topicName("Topic").build();
        Map map = Map.builder()
                .mapId(mapId)
                .status(Map.Status.APPROVED)
                .published(false)
                .mapData(objectMapper.createObjectNode())
                .build();

        when(administratorRepository.findBySupabaseUserId(adminSupabaseUserId)).thenReturn(Optional.of(admin));
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        doReturn(reflectedTopicLookup(topicId, "Topic", "Description"))
                .when(restTemplate)
                .getForObject(contains("/api/internal/topics/"), any(Class.class));
        when(entityManager.getReference(Administrator.class, adminId)).thenReturn(admin);
        when(entityManager.getReference(Topic.class, topicId)).thenReturn(topic);
        when(repository.save(any(Map.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map published = mapService.publishApprovedMap(mapId, adminSupabaseUserId, topicId);

        assertTrue(published.getPublished());
        assertEquals(topicId, published.getTopic().getTopicId());
        assertEquals(adminId, published.getPublishedByAdmin().getAdministratorId());
        assertNotNull(published.getPublishedAt());
    }

    @Test
    void getEditorRuntimeData_ReturnsPersistedMapDataWhenPresent() throws Exception {
        UUID mapId = UUID.randomUUID();
        com.fasterxml.jackson.databind.node.ObjectNode mapData = objectMapper.createObjectNode();
        mapData.put("foo", "bar");
        Map map = Map.builder().mapId(mapId).mapData(mapData).build();

        when(repository.findById(mapId)).thenReturn(Optional.of(map));

        Object result = mapService.getEditorRuntimeData(mapId);

        assertTrue(result instanceof java.util.Map);
        java.util.Map<?, ?> output = (java.util.Map<?, ?>) result;
        assertEquals("bar", output.get("foo"));
        verify(mapSubmissionRepository, never()).findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(any(UUID.class));
    }

    @Test
    void getEditorRuntimeData_FallsBackToLatestSubmissionSnapshotWhenMapDataMissing() throws Exception {
        UUID mapId = UUID.randomUUID();
        com.fasterxml.jackson.databind.node.ObjectNode snapshotData = objectMapper.createObjectNode();
        snapshotData.put("snapshot", true);
        Map map = Map.builder().mapId(mapId).mapData(null).build();
        MapSubmission submission = MapSubmission.builder().mapData(snapshotData).build();

        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapSubmissionRepository.findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(mapId))
                .thenReturn(Optional.of(submission));

        Object result = mapService.getEditorRuntimeData(mapId);

        assertTrue(result instanceof java.util.Map);
        java.util.Map<?, ?> output = (java.util.Map<?, ?>) result;
        assertEquals(Boolean.TRUE, output.get("snapshot"));
        verify(mapDraftRepository, never()).findById(any());
    }

    @Test
    void getEditorRuntimeData_FallsBackToLinkedDraftPayloadWhenAssetReferencesDraft() throws Exception {
        UUID mapId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        com.fasterxml.jackson.databind.node.ObjectNode draftData = objectMapper.createObjectNode();
        draftData.put("draft", "payload");
        Map map = Map.builder().mapId(mapId).mapData(null).asset("editor-draft:" + draftId).build();
        MapDraft draft = MapDraft.builder().mapDraftId(draftId).mapData(draftData).build();

        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapSubmissionRepository.findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(mapId))
                .thenReturn(Optional.empty());
        when(mapDraftRepository.findById(draftId)).thenReturn(Optional.of(draft));

        Object result = mapService.getEditorRuntimeData(mapId);

        assertTrue(result instanceof java.util.Map);
        java.util.Map<?, ?> output = (java.util.Map<?, ?>) result;
        assertEquals("payload", output.get("draft"));
    }

    @Test
    void getEditorRuntimeData_ReturnsPreviewUnavailablePayloadWhenNoSourcesExist() throws Exception {
        UUID mapId = UUID.randomUUID();
        Map map = Map.builder().mapId(mapId).mapData(null).asset(null).build();

        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapSubmissionRepository.findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(mapId))
                .thenReturn(Optional.empty());

        Object result = mapService.getEditorRuntimeData(mapId);

        assertTrue(result instanceof java.util.Map);
        java.util.Map<?, ?> output = (java.util.Map<?, ?>) result;
        assertEquals(Boolean.TRUE, output.get("previewUnavailable"));
        assertEquals(mapId, output.get("mapId"));
    }

    @Test
    void submitDraft_ConvertsEditorPayloadToTiledJsonBeforeSaving() {
        UUID ownerSupabaseUserId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        Contributor contributor = Contributor.builder().contributorId(contributorId).build();
        com.fasterxml.jackson.databind.node.ObjectNode layers = objectMapper.createObjectNode();
        layers.set("ground", objectMapper.valueToTree(List.of(List.of(0, 1))));
        layers.set("decor", objectMapper.valueToTree(List.of(List.of(2, 3))));
        layers.set("collision", objectMapper.valueToTree(List.of(List.of(4, 5))));
        com.fasterxml.jackson.databind.node.ObjectNode editorPayload = objectMapper.createObjectNode();
        editorPayload.set("layers", layers);
        editorPayload.put("width", 2);
        editorPayload.put("height", 1);
        editorPayload.put("tileSize", 16);
        MapDraft draft = MapDraft.builder()
                .mapDraftId(draftId)
                .contributor(contributor)
                .name("Editor Draft")
                .description("Draft Description")
                .mapData(editorPayload)
                .build();

        when(contributorRepository.findBySupabaseUserId(ownerSupabaseUserId)).thenReturn(Optional.of(contributor));
        when(mapDraftRepository.findById(draftId)).thenReturn(Optional.of(draft));
        when(entityManager.getReference(eq(Contributor.class), eq(contributorId))).thenReturn(contributor);
        when(repository.save(any(Map.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapSubmissionRepository.findTopByMapDraft_MapDraftIdAndContributor_ContributorIdOrderBySubmittedAtDescCreatedAtDesc(draftId, contributorId))
                .thenReturn(Optional.empty());

        Map saved = mapService.submitDraft(ownerSupabaseUserId, draftId, new MapEditorDraftStore.PublishDraftRequest(null, null));

        assertEquals("editor-draft:" + draftId, saved.getAsset());
        assertTrue(saved.getMapData().has("layers"));
        assertEquals(3, saved.getMapData().get("layers").size());
        assertTrue(saved.getMapData().has("tilesets"));
        assertEquals("map", saved.getMapData().get("type").asText());
        verify(mapSubmissionRepository).save(any(MapSubmission.class));
    }

    @Test
    void submitDraft_PreservesAlreadyTiledPayloadWithoutReconversion() {
        UUID ownerSupabaseUserId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID draftId = UUID.randomUUID();
        Contributor contributor = Contributor.builder().contributorId(contributorId).build();
        com.fasterxml.jackson.databind.node.ObjectNode tiledPayload = objectMapper.createObjectNode();
        tiledPayload.put("type", "map");
        tiledPayload.putArray("layers").add(objectMapper.createObjectNode().put("name", "ground"));
        tiledPayload.putArray("tilesets").add(objectMapper.createObjectNode().put("name", "tiles"));
        MapDraft draft = MapDraft.builder()
                .mapDraftId(draftId)
                .contributor(contributor)
                .name("Tiled Draft")
                .description("Already tiled")
                .mapData(tiledPayload)
                .build();

        when(contributorRepository.findBySupabaseUserId(ownerSupabaseUserId)).thenReturn(Optional.of(contributor));
        when(mapDraftRepository.findById(draftId)).thenReturn(Optional.of(draft));
        when(entityManager.getReference(eq(Contributor.class), eq(contributorId))).thenReturn(contributor);
        when(repository.save(any(Map.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapSubmissionRepository.findTopByMapDraft_MapDraftIdAndContributor_ContributorIdOrderBySubmittedAtDescCreatedAtDesc(draftId, contributorId))
                .thenReturn(Optional.empty());

        Map saved = mapService.submitDraft(ownerSupabaseUserId, draftId, new MapEditorDraftStore.PublishDraftRequest(null, null));

        assertTrue(saved.getMapData().equals(tiledPayload));
        verify(repository).save(argThat(map -> map != null && map.getMapData() != null && map.getMapData().equals(tiledPayload)));
    }

    @Test
    void approveMap_SyncsMapDataFromLatestSubmissionWhenMissing() {
        UUID adminSupabaseUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        com.fasterxml.jackson.databind.node.ObjectNode submittedData = objectMapper.createObjectNode();
        submittedData.put("synced", true);
        Administrator admin = Administrator.builder().administratorId(adminId).build();
        Map map = Map.builder().mapId(mapId).status(Map.Status.PENDING_REVIEW).mapData(null).build();
        MapSubmission submission = MapSubmission.builder().mapData(submittedData).build();

        when(administratorRepository.findBySupabaseUserId(adminSupabaseUserId)).thenReturn(Optional.of(admin));
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapSubmissionRepository.findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(mapId))
                .thenReturn(Optional.of(submission));
        when(entityManager.getReference(Administrator.class, adminId)).thenReturn(admin);
        when(repository.save(any(Map.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map approved = mapService.approveMap(mapId, adminSupabaseUserId);

        assertEquals(Map.Status.APPROVED, approved.getStatus());
        assertTrue(approved.getMapData().equals(submittedData));
        assertEquals(adminId, approved.getApprovedByAdmin().getAdministratorId());
    }

    @Test
    void publishApprovedMap_SyncsMapDataFromLatestSubmissionWhenMissing() {
        UUID adminSupabaseUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        com.fasterxml.jackson.databind.node.ObjectNode submittedData = objectMapper.createObjectNode();
        submittedData.put("synced", true);
        Administrator admin = Administrator.builder().administratorId(adminId).build();
        Topic topic = Topic.builder().topicId(topicId).topicName("Topic").build();
        Map map = Map.builder().mapId(mapId).status(Map.Status.APPROVED).published(false).mapData(null).build();
        MapSubmission submission = MapSubmission.builder().mapData(submittedData).build();

        when(administratorRepository.findBySupabaseUserId(adminSupabaseUserId)).thenReturn(Optional.of(admin));
        when(repository.findById(mapId)).thenReturn(Optional.of(map));
        when(mapSubmissionRepository.findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(mapId))
                .thenReturn(Optional.of(submission));
        doReturn(reflectedTopicLookup(topicId, "Topic", "Description"))
                .when(restTemplate)
                .getForObject(contains("/api/internal/topics/"), any(Class.class));
        when(entityManager.getReference(Administrator.class, adminId)).thenReturn(admin);
        when(entityManager.getReference(Topic.class, topicId)).thenReturn(topic);
        when(repository.save(any(Map.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map published = mapService.publishApprovedMap(mapId, adminSupabaseUserId, topicId);

        assertTrue(published.getPublished());
        assertTrue(published.getMapData().equals(submittedData));
        assertEquals(topicId, published.getTopic().getTopicId());
        assertEquals(adminId, published.getPublishedByAdmin().getAdministratorId());
    }

    private void stubLearner(UUID supabaseUserId, UUID learnerId) {
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 10, 1, 0));
    }

    private void stubEmptyCatalog(UUID learnerId) {
        when(mapRatingRepository.summarizeByMapIds(anyList())).thenReturn(List.of());
        when(mapLikeRepository.summarizeByMapIds(anyList())).thenReturn(List.of());
        when(mapRatingRepository.findAllByLearnerIdAndMapMapIdIn(eq(learnerId), anyList())).thenReturn(List.of());
        when(mapLikeRepository.findAllByLearnerIdAndMapMapIdIn(eq(learnerId), anyList())).thenReturn(List.of());
    }

    private Object reflectedTopicLookup(UUID topicId, String topicName, String description) {
        try {
            Class<?> type = Class.forName("com.smu.csd.maps.MapService$TopicLookupResponse");
            Constructor<?> constructor = type.getDeclaredConstructor(UUID.class, String.class, String.class);
            constructor.setAccessible(true);
            return constructor.newInstance(topicId, topicName, description);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
