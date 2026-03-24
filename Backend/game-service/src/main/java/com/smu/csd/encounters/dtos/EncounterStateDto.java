package com.smu.csd.encounters.dtos;

import java.util.List;
import java.util.UUID;

public record EncounterStateDto(
    UUID mapId,
    NpcSummaryDto npc,
    List<MonsterStateDto> monsters
) {}
