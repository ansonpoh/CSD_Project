package com.smu.csd.roles.contributor.analytics;

public interface ContributorModerationCountsProjection {
    long getTotalSubmitted();
    long getApprovedCount();
    long getRejectedCount();
    long getFlaggedCount();
}
