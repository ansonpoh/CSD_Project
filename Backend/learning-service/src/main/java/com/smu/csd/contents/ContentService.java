package com.smu.csd.contents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.ai.AIService;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.exception.ResourceNotFoundException;

@Service
public class ContentService {

    private final ContentRepository contentRepository;
    private final DuplicateDetectionService duplicateDetectionService;
    private final VectorStore vectorStore;
    private final TopicService topicService;
    private final AIService aiService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${GAME_URL:http://localhost:8082}")
    private String gameServiceUrl;

    public ContentService(ContentRepository contentRepository, TopicService topicService,
            DuplicateDetectionService duplicateDetectionService, VectorStore vectorStore,
            AIService aiService, ObjectMapper objectMapper, RestTemplate restTemplate) {
        this.contentRepository = contentRepository;
        this.duplicateDetectionService = duplicateDetectionService;
        this.vectorStore = vectorStore;
        this.topicService = topicService;
        this.aiService = aiService;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplate;
    }

    public Content submitContent(UUID contributorId, UUID topicId, UUID npcId, UUID mapId,
            String title, String description, List<String> narrations, String videoUrl)
            throws ResourceNotFoundException {
        Topic topic = topicService.getById(topicId);

        String body;
        try {
            body = objectMapper.writeValueAsString(narrations);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid narrations format: " + e.getMessage());
        }

        String normalized = duplicateDetectionService.normalize(title, narrations);
        String fingerprint = duplicateDetectionService.fingerprint(normalized);

        Optional<Content> exactMatch = contentRepository
            .findFirstByContentFingerprintAndTopicAndStatusIn(
                fingerprint,
                topic,
                List.of(Content.Status.PENDING_REVIEW, Content.Status.APPROVED)
            );

        if (exactMatch.isPresent()) {
            throw new IllegalStateException("Duplicate submission detected");
        }

        String textForEmbedding = (title == null ? "" : title) + "\n" + String.join(" ", narrations == null ? List.of() : narrations);

        List<Document> similar = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(textForEmbedding)
                        .topK(1)
                        .similarityThreshold(0.80)
                        .filterExpression("topicId == '" + topicId + "'")
                        .build()
        );

        if (!similar.isEmpty()) {
            throw new IllegalStateException(
                    "Likely semantic duplicate of content " + similar.get(0).getMetadata().get("contentId")
            );
        }

        Content content = Content.builder()
                .contributorId(contributorId)
                .topic(topic)
                .title(title)
                .description(description)
                .body(body)
                .status(Content.Status.PENDING_REVIEW)
                .videoUrl(videoUrl)
                .contentFingerprint(fingerprint)
                .build();

        content = contentRepository.save(content);

        // Call game-service to properly assign NPC to Content on Map
        try {
            String url = gameServiceUrl + "/api/internal/npc-maps";
            java.util.Map<String, UUID> assignReq = java.util.Map.of(
                "npcId", npcId,
                "mapId", mapId,
                "contentId", content.getContentId()
            );
            ResponseEntity<?> resp = restTemplate.postForEntity(url, assignReq, java.util.Map.class);
            if (!resp.getStatusCode().is2xxSuccessful()) { // Fallback error handling
                throw new Exception("Game service returned non-200");
            }
        } catch (Exception e) {
            // Rollback content creation if game service link fails
            contentRepository.delete(content);
            throw new IllegalStateException("Failed to assign content to NPC/Map in Game Service. " + e.getMessage());
        }

        vectorStore.add(List.of(new Document(
                textForEmbedding,
                java.util.Map.of(
                        "contentId", content.getContentId().toString(),
                        "topicId", topicId.toString()
                )
        )));

        aiService.screenContent(content);

        // Re-fetch so returned object reflects status set by AIService
        return getById(content.getContentId());
    }

    public Content getById(UUID contentId) throws ResourceNotFoundException {
        return contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "contentId", contentId));
    }

    public List<Content> getByContributorId(UUID contributorId) {
        return contentRepository.findByContributorId(contributorId);
    }

    public List<Content> getByStatus(Content.Status status) {
        return contentRepository.findByStatus(status);
    }

    public List<Content> getByTopic(UUID topicId) throws ResourceNotFoundException {
        Topic topic = topicService.getById(topicId);
        return contentRepository.findByTopic(topic);
    }

    public List<Content> searchByTitle(String keyword) {
        return contentRepository.findByTitleContainingIgnoreCase(keyword);
    }

    public AIModerationResult getModerationResult(UUID contentId) throws ResourceNotFoundException {
        return aiService.getModerationResult(contentId);
    }

    @Transactional
    public Content approveContent(UUID contentId) throws ResourceNotFoundException {
        Content content = getById(contentId);

        if (content.getStatus() != Content.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW content can be approved");
        }

        content.setStatus(Content.Status.APPROVED);
        return contentRepository.save(content);
    }

    @Transactional
    public Content rejectContent(UUID contentId) throws ResourceNotFoundException {
        Content content = getById(contentId);

        if (content.getStatus() != Content.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW content can be rejected");
        }

        content.setStatus(Content.Status.REJECTED);
        return contentRepository.save(content);
    }
}
