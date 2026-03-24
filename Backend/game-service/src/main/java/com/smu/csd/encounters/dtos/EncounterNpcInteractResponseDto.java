package com.smu.csd.encounters.dtos;

import java.util.UUID;

public record EncounterNpcInteractResponseDto(
    UUID mapId,
    UUID npcId,
    boolean completed,
    String message,
    EncounterStateDto state
) {}
