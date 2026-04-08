package com.smu.csd.contents;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.ai.AIService;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.contents.topics.TopicService;

public class ContentServiceUnitTest {

    private ContentRepository contentRepository;
    private DuplicateDetectionService duplicateDetectionService;
    private VectorStore vectorStore;
    private TopicService topicService;
    private AIService aiService;
    private ObjectMapper objectMapper;
    private RestTemplate restTemplate;
    private ContentService service;

    @BeforeEach
    void setUp() {
        contentRepository = mock(ContentRepository.class);
        duplicateDetectionService = new DuplicateDetectionService();
        vectorStore = mock(VectorStore.class);
        topicService = mock(TopicService.class);
        aiService = mock(AIService.class);
        objectMapper = new ObjectMapper();
        restTemplate = mock(RestTemplate.class);
        service = new ContentService(contentRepository, topicService, duplicateDetectionService, vectorStore, aiService, objectMapper, restTemplate);
    }

    @Test
    void submitContent_RejectsInvalidNarrationSerialization() throws Exception {
        ObjectMapper failingMapper = mock(ObjectMapper.class);
        ContentService failingService = new ContentService(contentRepository, topicService, duplicateDetectionService, vectorStore, aiService, failingMapper, restTemplate);
        UUID topicId = UUID.randomUUID();
        Topic topic = topic(topicId);
        doReturn(topic).when(topicService).getById(topicId);
        doThrow(new RuntimeException("boom")).when(failingMapper).writeValueAsString(any());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> failingService.submitContent(UUID.randomUUID(), topicId, UUID.randomUUID(), UUID.randomUUID(), "Title", "Desc", List.of("Line 1"), "video", null)
        );

        assertTrue(exception.getMessage().contains("Invalid narrations format"));
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void submitContent_RejectsExactDuplicateFingerprint() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        Topic topic = topic(topicId);
        Content existing = Content.builder()
                .contentId(UUID.randomUUID())
                .topic(topic)
                .status(Content.Status.APPROVED)
                .contentFingerprint(duplicateDetectionService.fingerprint(duplicateDetectionService.normalize("Title", List.of("Line 1"))))
                .build();

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.of(existing));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "video", null)
        );

        assertEquals("Duplicate submission detected", exception.getMessage());
        verify(vectorStore, never()).similaritySearch(any(SearchRequest.class));
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void submitContent_RejectsSemanticDuplicateFromVectorSimilarity() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        UUID existingContentId = UUID.randomUUID();
        when(vectorStore.similaritySearch(any(SearchRequest.class)))
                .thenReturn(List.of(new Document("text", Map.of("contentId", existingContentId.toString()))));
        when(contentRepository.findById(existingContentId))
                .thenReturn(Optional.of(
                        Content.builder()
                                .contentId(existingContentId)
                                .status(Content.Status.APPROVED)
                                .build()
                ));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "video", null)
        );

        assertTrue(exception.getMessage().contains("Likely semantic duplicate"));
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void submitContent_RollsBackSavedContentWhenNpcMapAssignmentFails() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(UUID.randomUUID());
            return content;
        });
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class))).thenThrow(new RuntimeException("downstream unavailable"));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "video", null)
        );

        assertTrue(exception.getMessage().contains("Failed to assign content to NPC/Map in Game Service"));
        verify(contentRepository).delete(any(Content.class));
        verify(aiService, never()).screenContent(any(Content.class));
    }

    @Test
    void approveContent_RejectsNonPendingReviewContent() {
        Content content = Content.builder()
                .contentId(UUID.randomUUID())
                .status(Content.Status.APPROVED)
                .build();
        when(contentRepository.findById(content.getContentId())).thenReturn(Optional.of(content));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.approveContent(content.getContentId()));

        assertEquals("Only PENDING_REVIEW content can be approved", exception.getMessage());
    }

    @Test
    void rejectContent_RejectsNonPendingReviewContent() {
        Content content = Content.builder()
                .contentId(UUID.randomUUID())
                .status(Content.Status.REJECTED)
                .build();
        when(contentRepository.findById(content.getContentId())).thenReturn(Optional.of(content));

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> service.rejectContent(content.getContentId(), "reason", "admin comments"));

        assertEquals("Only PENDING_REVIEW content can be rejected", exception.getMessage());
    }

    @Test
    void submitContent_WithVideo_SkipsAiScreeningAndMarksManualReview() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(contentId);
            return content;
        });
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class))).thenReturn(ResponseEntity.ok(Map.of()));
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(
                Content.builder().contentId(contentId).status(Content.Status.PENDING_REVIEW).build()
        ));

        service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "https://cdn.example/video.mp4", null);

        verify(aiService).markForManualVideoReview(any(Content.class));
        verify(aiService, never()).screenContent(any(Content.class));
    }

    @Test
    void submitContent_WithoutVideo_UsesAiScreening() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(contentId);
            return content;
        });
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class))).thenReturn(ResponseEntity.ok(Map.of()));
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(
                Content.builder().contentId(contentId).status(Content.Status.PENDING_REVIEW).build()
        ));

        service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), null, null);

        verify(aiService).screenContent(any(Content.class));
        verify(aiService, never()).markForManualVideoReview(any(Content.class));
    }

    @Test
    void submitContent_ResubmissionFailsWhenOriginalMissing() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID originalId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findById(originalId)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> service.submitContent(UUID.randomUUID(), topicId, UUID.randomUUID(), UUID.randomUUID(),
                        "Title", "Desc", List.of("Line"), null, originalId)
        );

        assertTrue(exception.getMessage().contains(originalId.toString()));
    }

    @Test
    void submitContent_ResubmissionFailsWhenContributorDiffersFromOriginalOwner() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID originalId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findById(originalId)).thenReturn(Optional.of(
                Content.builder()
                        .contentId(originalId)
                        .contributorId(UUID.randomUUID())
                        .status(Content.Status.REJECTED)
                        .build()
        ));

        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> service.submitContent(contributorId, topicId, UUID.randomUUID(), UUID.randomUUID(),
                        "Title", "Desc", List.of("Line"), null, originalId)
        );

        assertEquals("Cannot resubmit content owned by another contributor", exception.getMessage());
    }

    @Test
    void submitContent_ResubmissionFailsWhenOriginalNotRejected() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID originalId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findById(originalId)).thenReturn(Optional.of(
                Content.builder()
                        .contentId(originalId)
                        .contributorId(contributorId)
                        .status(Content.Status.PENDING_REVIEW)
                        .build()
        ));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.submitContent(contributorId, topicId, UUID.randomUUID(), UUID.randomUUID(),
                        "Title", "Desc", List.of("Line"), null, originalId)
        );

        assertEquals("Can only resubmit rejected content", exception.getMessage());
    }

    @Test
    void getByContributorIdWithFallback_UsesFallbackSupabaseIdWhenPrimaryHasNoRows() {
        UUID contributorId = UUID.randomUUID();
        UUID supabaseId = UUID.randomUUID();
        Content fallbackContent = Content.builder().contentId(UUID.randomUUID()).contributorId(supabaseId).build();

        when(contentRepository.findByContributorId(contributorId)).thenReturn(List.of());
        when(contentRepository.findByContributorId(supabaseId)).thenReturn(List.of(fallbackContent));

        List<Content> result = service.getByContributorIdWithFallback(contributorId, supabaseId);

        assertEquals(1, result.size());
        assertEquals(fallbackContent.getContentId(), result.get(0).getContentId());
    }

    @Test
    void getByContributorIdWithFallback_DoesNotFallbackWhenSupabaseIsNullOrEqual() {
        UUID contributorId = UUID.randomUUID();
        when(contentRepository.findByContributorId(contributorId)).thenReturn(List.of());

        List<Content> nullSupabase = service.getByContributorIdWithFallback(contributorId, null);
        List<Content> sameSupabase = service.getByContributorIdWithFallback(contributorId, contributorId);

        assertTrue(nullSupabase.isEmpty());
        assertTrue(sameSupabase.isEmpty());
        verify(contentRepository, never()).findByContributorId(null);
    }

    @Test
    void approveContent_TransitionsPendingToApproved() throws Exception {
        UUID contentId = UUID.randomUUID();
        Content pending = Content.builder().contentId(contentId).status(Content.Status.PENDING_REVIEW).build();
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(pending));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Content approved = service.approveContent(contentId);

        assertEquals(Content.Status.APPROVED, approved.getStatus());
    }

    @Test
    void rejectContent_TransitionsPendingAndStoresFeedback() throws Exception {
        UUID contentId = UUID.randomUUID();
        Content pending = Content.builder().contentId(contentId).status(Content.Status.PENDING_REVIEW).build();
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(pending));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Content rejected = service.rejectContent(contentId, "inaccurate", "please revise facts");

        assertEquals(Content.Status.REJECTED, rejected.getStatus());
        assertEquals("inaccurate", rejected.getRejectionReason());
        assertEquals("please revise facts", rejected.getAdminComments());
        assertFalse(rejected.getFeedbackDate() == null);
    }

    @Test
    void submitContent_IgnoresMalformedSemanticCandidatesAndContinuesSubmission() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        UUID rejectedCandidateId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(
                new Document("missing-meta", Map.of()),
                new Document("invalid-id", Map.of("contentId", "not-a-uuid")),
                new Document("rejected", Map.of("contentId", rejectedCandidateId.toString()))
        ));
        when(contentRepository.findById(rejectedCandidateId)).thenReturn(Optional.of(
                Content.builder().contentId(rejectedCandidateId).status(Content.Status.REJECTED).build()
        ));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(contentId);
            return content;
        });
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class))).thenReturn(ResponseEntity.ok(Map.of()));
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(
                Content.builder().contentId(contentId).status(Content.Status.PENDING_REVIEW).build()
        ));

        Content created = service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line"), null, null);

        assertEquals(contentId, created.getContentId());
        verify(vectorStore).add(anyList());
        verify(aiService).screenContent(any(Content.class));
    }

    @Test
    void submitContent_RollsBackWhenGameServiceReturnsNon2xx() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(UUID.randomUUID());
            return content;
        });
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class))).thenReturn(ResponseEntity.badRequest().build());

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line"), null, null)
        );

        assertTrue(exception.getMessage().contains("Game service returned non-200"));
        verify(contentRepository).delete(any(Content.class));
        verify(vectorStore, never()).add(anyList());
    }

    @Test
    void submitContent_BlankVideoStringIsTreatedAsNoVideo() throws Exception {
        UUID topicId = UUID.randomUUID();
        UUID contributorId = UUID.randomUUID();
        UUID npcId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        Topic topic = topic(topicId);

        doReturn(topic).when(topicService).getById(topicId);
        when(contentRepository.findFirstByContentFingerprintAndTopicAndStatusIn(anyString(), eq(topic), anyList()))
                .thenReturn(Optional.empty());
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> {
            Content content = invocation.getArgument(0);
            content.setContentId(contentId);
            return content;
        });
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class))).thenReturn(ResponseEntity.ok(Map.of()));
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(
                Content.builder().contentId(contentId).status(Content.Status.PENDING_REVIEW).build()
        ));

        service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line"), "   ", null);

        verify(aiService).screenContent(any(Content.class));
        verify(aiService, never()).markForManualVideoReview(any(Content.class));
    }

    @Test
    void getByStatus_DelegatesToRepository() {
        Content pending = Content.builder().contentId(UUID.randomUUID()).status(Content.Status.PENDING_REVIEW).build();
        when(contentRepository.findByStatus(Content.Status.PENDING_REVIEW)).thenReturn(List.of(pending));

        List<Content> result = service.getByStatus(Content.Status.PENDING_REVIEW);

        assertEquals(1, result.size());
        assertEquals(pending.getContentId(), result.get(0).getContentId());
    }

    @Test
    void getByTopic_ResolvesTopicThenFindsRows() throws Exception {
        UUID topicId = UUID.randomUUID();
        Topic topic = topic(topicId);
        Content content = Content.builder().contentId(UUID.randomUUID()).topic(topic).build();
        when(topicService.getById(topicId)).thenReturn(topic);
        when(contentRepository.findByTopic(topic)).thenReturn(List.of(content));

        List<Content> result = service.getByTopic(topicId);

        assertEquals(1, result.size());
        assertEquals(content.getContentId(), result.get(0).getContentId());
    }

    @Test
    void searchByTitle_DelegatesToRepository() {
        Content content = Content.builder().contentId(UUID.randomUUID()).title("Title A").build();
        when(contentRepository.findByTitleContainingIgnoreCase("title")).thenReturn(List.of(content));

        List<Content> result = service.searchByTitle("title");

        assertEquals(1, result.size());
        assertEquals(content.getContentId(), result.get(0).getContentId());
    }

    @Test
    void getModerationResult_DelegatesToAiService() throws Exception {
        UUID contentId = UUID.randomUUID();
        AIModerationResult moderation = AIModerationResult.builder().resultId(UUID.randomUUID()).build();
        when(aiService.getModerationResult(contentId)).thenReturn(moderation);

        AIModerationResult result = service.getModerationResult(contentId);

        assertEquals(moderation.getResultId(), result.getResultId());
    }

    private Topic topic(UUID topicId) {
        return Topic.builder()
                .topicId(topicId)
                .topicName("Topic")
                .description("Description")
                .build();
    }
}
