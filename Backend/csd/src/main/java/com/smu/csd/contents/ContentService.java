package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.ai.AIService;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.roles.contributor.ContributorService;

@Service
public class ContentService {

    private final ContentRepository contentRepository;
    private final TopicService topicService;
    private final ContributorService contributorService;
    private final AIService aiService;

    public ContentService(ContentRepository contentRepository, TopicService topicService,
            ContributorService contributorService, AIService aiService) {
        this.contentRepository = contentRepository;
        this.topicService = topicService;
        this.contributorService = contributorService;
        this.aiService = aiService;
    }

    // -------------------------------------------------------------------------
    // Contributor Actions
    // -------------------------------------------------------------------------

    /**
     * Contributor submits content directly - no draft step.
     * Creates content as PENDING_REVIEW and immediately triggers AI screening,
     * which will auto-approve, auto-reject, or flag for human moderator review.
     */
    @Transactional
    public Content submitContent(UUID contributorId, UUID topicId, String title, String body)
            throws ResourceNotFoundException {
        contributorService.getById(contributorId);
        Topic topic = topicService.getById(topicId);

        Content content = Content.builder()
                .contributorId(contributorId)
                .topic(topic)
                .title(title)
                .body(body)
                .status(Content.Status.PENDING_REVIEW)
                .build();

        contentRepository.save(content);
        aiService.screenContent(content);

        // Re-fetch so returned object reflects status set by AIService
        return getById(content.getContentId());
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    public Content getById(UUID contentId) throws ResourceNotFoundException {
        return contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "contentId", contentId));
    }

    /** Contributor uses this to see all their own submissions */
    public List<Content> getByContributorId(UUID contributorId) {
        return contentRepository.findByContributorId(contributorId);
    }

    /** Moderator uses this to load the review queue, e.g. getByStatus(PENDING_REVIEW) */
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

    // -------------------------------------------------------------------------
    // Moderator Actions (only for content AI flagged as NEEDS_REVIEW)
    // -------------------------------------------------------------------------

    /** Moderator manually approves content after reviewing AI's NEEDS_REVIEW flag */
    @Transactional
    public Content approveContent(UUID contentId) throws ResourceNotFoundException {
        Content content = getById(contentId);

        if (content.getStatus() != Content.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW content can be approved");
        }

        content.setStatus(Content.Status.APPROVED);
        return contentRepository.save(content);
    }

    /** Moderator manually rejects content after reviewing AI's NEEDS_REVIEW flag */
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