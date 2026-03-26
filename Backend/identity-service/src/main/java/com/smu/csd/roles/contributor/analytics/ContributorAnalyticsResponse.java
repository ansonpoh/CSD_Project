package com.smu.csd.roles.contributor.analytics;

import java.util.List;

public record ContributorAnalyticsResponse(
        ModerationRates moderationRates,
        List<ContentPerformance> topPerformingContents,
        List<ContentRatingItem> ratingsPerContent
) {
    public record ModerationRates(
            long totalSubmitted,
            long approvedCount,
            long rejectedCount,
            long flaggedCount,
            double approvalRate,
            double rejectionRate,
            double flaggedRate
    ) {}

    public record ContentPerformance(
            java.util.UUID contentId,
            String title,
            double averageRating,
            long ratingCount
    ) {}

    public record ContentRatingItem(
            java.util.UUID contentId,
            String title,
            String status,
            double averageRating,
            long ratingCount
    ) {}
}
