package com.smu.csd.contents.flags;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentService;
import com.smu.csd.exception.ResourceNotFoundException;

@Service
public class ContentFlagService {

    private static final int MAX_DETAILS_LENGTH = 1000;

    private final ContentFlagRepository contentFlagRepository;
    private final ContentService contentService;

    public ContentFlagService(
            ContentFlagRepository contentFlagRepository,
            ContentService contentService
    ) {
        this.contentFlagRepository = contentFlagRepository;
        this.contentService = contentService;
    }

    public ContentFlag createFlag(
            UUID contentId,
            UUID reportedBy,
            ContentFlag.FlagReason reason,
            String details
    ) throws ResourceNotFoundException {
        // Assume reporting user is valid Learner based on JWT authority

        if (reason == null) {
            throw new IllegalArgumentException("Flag reason is required");
        }

        String normalizedDetails = normalizeText(details);

        if (reason == ContentFlag.FlagReason.OTHER && normalizedDetails == null) {
            throw new IllegalArgumentException("Details are required when reason is OTHER");
        }

        Content content = contentService.getById(contentId);

        if (content.getStatus() != Content.Status.APPROVED) {
            throw new IllegalStateException("Only APPROVED content can be flagged");
        }

        if (contentFlagRepository.existsByContentContentIdAndReportedByAndStatus(
                contentId, reportedBy, ContentFlag.FlagStatus.OPEN)) {
            throw new IllegalStateException("You already have an open flag for this content");
        }

        ContentFlag flag = ContentFlag.builder()
                .content(content)
                .reportedBy(reportedBy)
                .reason(reason)
                .details(normalizedDetails)
                .status(ContentFlag.FlagStatus.OPEN)
                .build();

        return contentFlagRepository.save(flag);
    }

    public List<ContentFlag> getOpenFlags() {
        return contentFlagRepository.findByStatusOrderByCreatedAtAsc(ContentFlag.FlagStatus.OPEN);
    }

    public List<ContentFlag> getFlagsForContent(UUID contentId) throws ResourceNotFoundException {
        contentService.getById(contentId);
        return contentFlagRepository.findByContentContentIdOrderByCreatedAtDesc(contentId);
    }

    public ContentFlag reviewFlag(
            UUID contentFlagId,
            UUID reviewedBy,
            ContentFlag.FlagStatus status,
            String resolutionNotes
    ) throws ResourceNotFoundException {
        if (status == null) {
            throw new IllegalArgumentException("Review status is required");
        }

        if (status != ContentFlag.FlagStatus.REVIEWED && status != ContentFlag.FlagStatus.DISMISSED) {
            throw new IllegalArgumentException("Review status must be REVIEWED or DISMISSED");
        }
        
        // Assume reviewer is valid Administrator based on JWT authority

        ContentFlag flag = getById(contentFlagId);

        if (flag.getStatus() != ContentFlag.FlagStatus.OPEN) {
            throw new IllegalStateException("Only OPEN flags can be reviewed");
        }

        String normalizedNotes = normalizeText(resolutionNotes);

        if (status == ContentFlag.FlagStatus.DISMISSED && normalizedNotes == null) {
            throw new IllegalArgumentException("Resolution notes are required when dismissing a flag");
        }

        flag.setStatus(status);
        flag.setReviewedBy(reviewedBy);
        flag.setReviewedAt(LocalDateTime.now());
        flag.setResolutionNotes(normalizedNotes);

        return contentFlagRepository.save(flag);
    }

    public ContentFlag getById(UUID contentFlagId) throws ResourceNotFoundException {
        return contentFlagRepository.findById(contentFlagId)
                .orElseThrow(() -> new ResourceNotFoundException("ContentFlag", "contentFlagId", contentFlagId));
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        if (trimmed.length() > MAX_DETAILS_LENGTH) {
            throw new IllegalArgumentException("Text must not exceed " + MAX_DETAILS_LENGTH + " characters");
        }

        return trimmed;
    }
}
