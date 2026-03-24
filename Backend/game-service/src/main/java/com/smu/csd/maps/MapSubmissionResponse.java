package com.smu.csd.maps;

import java.time.LocalDateTime;
import java.util.UUID;

public record MapSubmissionResponse(
    UUID mapId,
    String name,
    String description,
    String asset,
    String status,
    Boolean published,
    UUID topicId,
    String topicName,
    UUID submittedByContributorId,
    String rejectionReason,
    UUID approvedByAdminId,
    LocalDateTime approvedAt,
    UUID publishedByAdminId,
    LocalDateTime publishedAt
) {}
