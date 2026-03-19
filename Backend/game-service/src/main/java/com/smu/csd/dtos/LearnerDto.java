package com.smu.csd.dtos;

import java.util.UUID;

public record LearnerDto(
    UUID learnerId,
    Integer totalXp,
    Integer level,
    Integer gold
) {}
