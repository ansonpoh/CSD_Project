package com.smu.csd.encounters.dtos;

import java.util.List;
import java.util.UUID;

import com.smu.csd.monsters.Monster;
import com.smu.csd.npcs.npc_map.NPCMapLessonResponse;

public record EncounterRuntimeDto(
    UUID mapId,
    List<NPCMapLessonResponse> npcs,
    List<Monster> monsters,
    EncounterStateDto encounterState
) {}
