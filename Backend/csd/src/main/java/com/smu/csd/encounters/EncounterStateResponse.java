package com.smu.csd.encounters;

import java.util.List;
import java.util.UUID;

public record EncounterStateResponse(
    UUID mapId,
    List<EncounterPairResponse> pairs,
    List<EncounterProgressResponse> progress,
    EncounterTelemetryDashboardResponse telemetry
) {}
