package com.smu.csd.roles.contributor.analytics;

import java.util.UUID;

public interface ContributorContentRatingProjection {
    UUID getContentId();
    String getTitle();
    String getStatus();
    double getAverageRating();
    long getRatingCount();
}
