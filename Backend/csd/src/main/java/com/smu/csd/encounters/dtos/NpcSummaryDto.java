package com.smu.csd.encounters.dtos;

import java.util.List;
import java.util.UUID;

public record NpcSummaryDto(
    int total,
    int completed,
    List<UUID> completedNpcIds,
    boolean allCompleted
) {}
