package com.smu.csd.contents;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
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
                () -> failingService.submitContent(UUID.randomUUID(), topicId, UUID.randomUUID(), UUID.randomUUID(), "Title", "Desc", List.of("Line 1"), "video")
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
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "video")
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
        when(vectorStore.similaritySearch(any(SearchRequest.class)))
                .thenReturn(List.of(new Document("text", Map.of("contentId", UUID.randomUUID().toString()))));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "video")
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
                () -> service.submitContent(contributorId, topicId, npcId, mapId, "Title", "Desc", List.of("Line 1"), "video")
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

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.rejectContent(content.getContentId()));

        assertEquals("Only PENDING_REVIEW content can be rejected", exception.getMessage());
    }

    private Topic topic(UUID topicId) {
        return Topic.builder()
                .topicId(topicId)
                .topicName("Topic")
                .description("Description")
                .build();
    }
}
