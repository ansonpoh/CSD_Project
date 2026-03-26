package com.smu.csd.roles.contributor.analytics;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ContributorAnalyticsService {
    private final ContributorAnalyticsRepository repository;

    public ContributorAnalyticsService(ContributorAnalyticsRepository repository) {
        this.repository = repository;
    }

    public ContributorAnalyticsResponse getAnalytics(UUID contributorId) {
        ContributorModerationCountsProjection counts = repository.getModerationCounts(contributorId);
        List<ContributorAnalyticsResponse.ContentPerformance> topPerformingContents =
                repository.getTopPerformingContents(contributorId, PageRequest.of(0, 3)).stream()
                        .map(row -> new ContributorAnalyticsResponse.ContentPerformance(
                                row.getContentId(),
                                row.getTitle(),
                                row.getAverageRating(),
                                row.getRatingCount()
                        ))
                        .toList();
        List<ContributorAnalyticsResponse.ContentRatingItem> ratingsPerContent =
                repository.getRatingsPerContent(contributorId).stream()
                        .map(row -> new ContributorAnalyticsResponse.ContentRatingItem(
                                row.getContentId(),
                                row.getTitle(),
                                row.getStatus(),
                                row.getAverageRating(),
                                row.getRatingCount()
                        ))
                        .toList();

        ContributorAnalyticsResponse.ModerationRates moderationRates = new ContributorAnalyticsResponse.ModerationRates(
                counts.getTotalSubmitted(),
                counts.getApprovedCount(),
                counts.getRejectedCount(),
                counts.getFlaggedCount(),
                asPercentage(counts.getApprovedCount(), counts.getTotalSubmitted()),
                asPercentage(counts.getRejectedCount(), counts.getTotalSubmitted()),
                asPercentage(counts.getFlaggedCount(), counts.getTotalSubmitted())
        );

        return new ContributorAnalyticsResponse(
                moderationRates,
                topPerformingContents,
                ratingsPerContent
        );
    }

    private double asPercentage(long value, long total) {
        if (total <= 0) {
            return 0.0;
        }

        double percentage = (value * 100.0) / total;
        return BigDecimal.valueOf(percentage)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
