package com.smu.csd.roles.contributor.analytics;

import java.util.UUID;

public interface ContributorContentPerformanceProjection {
    UUID getContentId();
    String getTitle();
    double getAverageRating();
    long getRatingCount();
}
