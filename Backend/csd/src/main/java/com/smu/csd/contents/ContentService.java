package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.ai.AIService;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.Map;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.NPC;
import com.smu.csd.npcs.NPCRepository;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapRepository;
import com.smu.csd.roles.contributor.ContributorService;

@Service
public class ContentService {

    private final ContentRepository contentRepository;
    private final TopicService topicService;
    private final ContributorService contributorService;
    private final AIService aiService;
    private final NPCRepository npcRepository;
    private final MapRepository mapRepository;
    private final NPCMapRepository npcMapRepository;
    private final ObjectMapper objectMapper;

    public ContentService(ContentRepository contentRepository, TopicService topicService,
            ContributorService contributorService, AIService aiService,
            NPCRepository npcRepository, MapRepository mapRepository,
            NPCMapRepository npcMapRepository, ObjectMapper objectMapper) {
        this.contentRepository = contentRepository;
        this.topicService = topicService;
        this.contributorService = contributorService;
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
    @Transactional
    public Content submitContent(UUID contributorId, UUID topicId, UUID npcId, UUID mapId,
            String title, String description, List<String> narrations)
            throws ResourceNotFoundException {
        contributorService.getById(contributorId);
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

        Content content = Content.builder()
                .contributorId(contributorId)
                .topic(topic)
                .title(title)
                .description(description)
                .body(body)
                .status(Content.Status.PENDING_REVIEW)
                .videoKey(null) // Temp null
                .build();

        contentRepository.save(content);

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
