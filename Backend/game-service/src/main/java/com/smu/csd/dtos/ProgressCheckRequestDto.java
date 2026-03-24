package com.smu.csd.dtos;

import java.util.List;
import java.util.UUID;

public record ProgressCheckRequestDto(
    UUID learnerId,
    List<UUID> contentIds
) {}
