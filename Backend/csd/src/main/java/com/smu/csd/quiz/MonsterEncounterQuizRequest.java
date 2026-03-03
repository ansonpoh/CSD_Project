package com.smu.csd.quiz;

import java.util.UUID;

public record MonsterEncounterQuizRequest(
    UUID mapId,
    UUID monsterId,
    Boolean bossEncounter
) {}
