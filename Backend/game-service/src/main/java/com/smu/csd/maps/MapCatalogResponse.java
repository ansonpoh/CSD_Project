package com.smu.csd.maps;

import java.util.UUID;

public record MapCatalogResponse(
    UUID mapId,
    String name,
    String description,
    String asset,
    UUID worldId,
    String status,
    Boolean published,
    UUID topicId,
    UUID submittedByContributorId,
    String rejectionReason,
    UUID approvedByAdminId,
    java.time.LocalDateTime approvedAt,
    UUID publishedByAdminId,
    java.time.LocalDateTime publishedAt,
    Double averageRating,
    Long ratingCount,
    Long likeCount,
    Integer currentUserRating,
    Boolean currentUserLiked
) {}
