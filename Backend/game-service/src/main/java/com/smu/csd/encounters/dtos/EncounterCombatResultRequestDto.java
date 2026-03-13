package com.smu.csd.encounters.dtos;

import java.util.UUID;

public record EncounterCombatResultRequestDto(
    UUID mapId,
    UUID monsterId,
    Boolean won
) {}
