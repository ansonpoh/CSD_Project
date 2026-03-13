package com.smu.csd.contents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.ai.AIService;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.Map;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.NPC;
import com.smu.csd.npcs.NPCRepository;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapRepository;

@Service
public class ContentService {

    private final ContentRepository contentRepository;
    private final DuplicateDetectionService duplicateDetectionService;
    private final VectorStore vectorStore;
    private final TopicService topicService;
    private final AIService aiService;
    private final NPCRepository npcRepository;
    private final MapRepository mapRepository;
    private final NPCMapRepository npcMapRepository;
    private final ObjectMapper objectMapper;

    public ContentService(ContentRepository contentRepository, TopicService topicService,
            DuplicateDetectionService duplicateDetectionService, VectorStore vectorStore,
            AIService aiService,
            NPCRepository npcRepository, MapRepository mapRepository,
            NPCMapRepository npcMapRepository, ObjectMapper objectMapper) {
        this.contentRepository = contentRepository;
        this.duplicateDetectionService = duplicateDetectionService;
        this.vectorStore = vectorStore;
        this.topicService = topicService;
        this.aiService = aiService;
        this.npcRepository = npcRepository;
        this.mapRepository = mapRepository;
        this.npcMapRepository = npcMapRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Contributor submits their narration lines (written manually or edited from AI preview).
     * The provided narrations are serialised to JSON and stored as the content body.
     * AI screening still runs on whatever the contributor submitted.
     */
    public Content submitContent(UUID contributorId, UUID topicId, UUID npcId, UUID mapId,
            String title, String description, List<String> narrations, String videoUrl)
            throws ResourceNotFoundException {
        // Assume contributor is valid based on JWT authority
        Topic topic = topicService.getById(topicId);
        NPC npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new ResourceNotFoundException("NPC", "npcId", npcId));
        Map map = mapRepository.findById(mapId)
                .orElseThrow(() -> new ResourceNotFoundException("Map", "mapId", mapId));

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

        contentRepository.save(content);

        vectorStore.add(List.of(new Document(
                textForEmbedding,
                java.util.Map.of(
                        "contentId", content.getContentId().toString(),
                        "topicId", topicId.toString()
                )
        )));

        NPCMap npcMap = NPCMap.builder()
                .npc(npc)
                .map(map)
                .content(content)
                .build();
        npcMapRepository.save(npcMap);

        aiService.screenContent(content);

        // Re-fetch so returned object reflects status set by AIService
        return getById(content.getContentId());
    }

    public Content getById(UUID contentId) throws ResourceNotFoundException {
        return contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "contentId", contentId));
    }

    // Contributor uses this to see all their own submissions
    public List<Content> getByContributorId(UUID contributorId) {
        return contentRepository.findByContributorId(contributorId);
    }

    // Moderator uses this to load the review queue, e.g. getByStatus(PENDING_REVIEW)
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

    // Moderator manually approves content after reviewing AI's NEEDS_REVIEW flag
    @Transactional
    public Content approveContent(UUID contentId) throws ResourceNotFoundException {
        Content content = getById(contentId);

        if (content.getStatus() != Content.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW content can be approved");
        }

        content.setStatus(Content.Status.APPROVED);
        return contentRepository.save(content);
    }

    // Moderator manually rejects content after reviewing AI's NEEDS_REVIEW flag
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
