package com.smu.csd.maps.ratings;

import java.util.UUID;

public interface MapRatingSummaryProjection {
    UUID getMapId();
    Double getAverageRating();
    Long getRatingCount();
}
