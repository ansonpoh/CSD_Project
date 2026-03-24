package com.smu.csd.contents.ratings;

import java.util.UUID;

public interface ContentRatingSummaryProjection {
    UUID getContentId();
    Double getAverageRating();
    Long getRatingCount();
}
