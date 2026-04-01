package com.smu.csd.contents.ratings;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.dtos.LearnerDto;
import com.smu.csd.exception.ResourceNotFoundException;

@Service
public class ContentRatingService {
    private final ContentRepository contentRepository;
    private final ContentRatingRepository contentRatingRepository;
    private final RestTemplate restTemplate;

    @Value("${PLAYER_SERVICE_URL:http://player-service:8084}")
    private String playerServiceUrl;

    public ContentRatingService(
        ContentRepository contentRepository,
        ContentRatingRepository contentRatingRepository,
        RestTemplate restTemplate
    ) {
        this.contentRepository = contentRepository;
        this.contentRatingRepository = contentRatingRepository;
        this.restTemplate = restTemplate;
    }

    @Transactional
    public ContentRatingResponse updateRating(UUID contentId, UUID supabaseUserId, int rating) throws ResourceNotFoundException {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }

        Content content = requireApprovedContent(contentId);
        UUID learnerId = requireLearnerId(supabaseUserId);
        List<ContentRating> existing = contentRatingRepository
            .findAllByContentContentIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(contentId, learnerId);

        ContentRating record;
        if (existing.isEmpty()) {
            record = ContentRating.builder()
                .content(content)
                .learnerId(learnerId)
                .build();
        } else {
            record = existing.get(0);
            if (existing.size() > 1) {
                contentRatingRepository.deleteAll(existing.subList(1, existing.size()));
            }
        }

        record.setRating(rating);
        contentRatingRepository.save(record);
        return buildRatingSummary(contentId, learnerId);
    }

    public ContentRatingResponse getRatingSummary(UUID contentId, UUID supabaseUserId) throws ResourceNotFoundException {
        UUID learnerId = findLearnerId(supabaseUserId);
        return buildRatingSummary(contentId, learnerId);
    }

    public ContentRatingResponse getRatingSummaryForLearner(UUID contentId, UUID learnerId) throws ResourceNotFoundException {
        return buildRatingSummary(contentId, learnerId);
    }

    private ContentRatingResponse buildRatingSummary(UUID contentId, UUID learnerId) throws ResourceNotFoundException {
        Content content = requireContent(contentId);
        ContentRatingSummaryProjection summary = contentRatingRepository.summarizeByContentIds(List.of(contentId))
            .stream()
            .findFirst()
            .orElse(null);
        Integer currentUserRating = learnerId == null
            ? null
            : contentRatingRepository.findAllByLearnerIdAndContentContentIdIn(learnerId, List.of(contentId))
                .stream()
                .findFirst()
                .map(ContentRating::getRating)
                .orElse(null);

        double averageRating = summary == null || summary.getAverageRating() == null
            ? 0.0
            : roundRating(summary.getAverageRating());
        long ratingCount = summary == null || summary.getRatingCount() == null
            ? 0L
            : summary.getRatingCount();

        return new ContentRatingResponse(
            content.getContentId(),
            averageRating,
            ratingCount,
            currentUserRating
        );
    }

    private Content requireContent(UUID contentId) throws ResourceNotFoundException {
        return contentRepository.findById(contentId)
            .orElseThrow(() -> new ResourceNotFoundException("Content", "contentId", contentId));
    }

    private Content requireApprovedContent(UUID contentId) throws ResourceNotFoundException {
        Content content = requireContent(contentId);
        if (content.getStatus() != Content.Status.APPROVED) {
            throw new IllegalStateException("Only approved content can be rated.");
        }
        return content;
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

    private double roundRating(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
