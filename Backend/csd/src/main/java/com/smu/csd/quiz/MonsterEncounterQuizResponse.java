package com.smu.csd.quiz;

import java.util.List;
import java.util.UUID;

public record MonsterEncounterQuizResponse(
    UUID mapId,
    UUID monsterId,
    String monsterName,
    boolean bossEncounter,
    String difficulty,
    int requiredAccuracyPercent,
    int requiredCorrectAnswers,
    int totalQuestions,
    int startingMonsterHpPercent,
    int lossStreak,
    List<EncounterQuizQuestion> questions
) {}
