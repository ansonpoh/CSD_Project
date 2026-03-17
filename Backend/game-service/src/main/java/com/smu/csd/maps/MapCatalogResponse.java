package com.smu.csd.maps;

import java.util.UUID;

public record MapCatalogResponse(
    UUID mapId,
    String name,
    String description,
    String asset,
    UUID worldId,
    Double averageRating,
    Long ratingCount,
    Long likeCount,
    Integer currentUserRating,
    Boolean currentUserLiked
) {}
