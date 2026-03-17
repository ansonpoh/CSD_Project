package com.smu.csd.contents.ratings;

import java.util.UUID;

public record ContentRatingResponse(
    UUID contentId,
    double averageRating,
    long ratingCount,
    Integer currentUserRating
) {}
