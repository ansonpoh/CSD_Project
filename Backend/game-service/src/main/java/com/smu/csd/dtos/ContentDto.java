package com.smu.csd.dtos;

import java.util.UUID;

public record ContentDto(
    UUID contentId,
    String title,
    String body,
    UUID topicId,
    String topicName,
    String videoUrl,
    String status,
    Double averageRating,
    Long ratingCount
) {}
