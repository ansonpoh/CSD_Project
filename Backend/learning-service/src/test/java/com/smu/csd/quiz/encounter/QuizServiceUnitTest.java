package com.smu.csd.quiz.encounter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

public class QuizServiceUnitTest {

    private RestTemplate restTemplate;
    private QuizService service;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        service = new QuizService(restTemplate);
    }

    @Test
    void generateMonsterEncounterQuiz_RejectsNullRequestOrMapId() {
        assertThrows(IllegalArgumentException.class, () -> service.generateMonsterEncounterQuiz(null, UUID.randomUUID()));
        assertThrows(IllegalArgumentException.class, () -> service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(null, UUID.randomUUID(), false), UUID.randomUUID()));
    }

    @Test
    void generateMonsterEncounterQuiz_BossEncounterUsesHardDifficultyAndStricterAccuracy() {
        UUID mapId = UUID.randomUUID();
        UUID monsterId = UUID.randomUUID();
        stubLessonLines(List.of(Map.of("contentBody", "This is a sufficiently long lesson line with meaningful vocabulary.")));
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Boss Monster"));

        MonsterEncounterQuizResponse result = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, monsterId, true), UUID.randomUUID());

        assertTrue(result.bossEncounter());
        assertEquals("hard", result.difficulty());
        assertEquals(100, result.requiredAccuracyPercent());
        assertEquals(10, result.requiredCorrectAnswers());
    }

    @Test
    void generateMonsterEncounterQuiz_NormalEncounterUsesNormalDifficultyAndExpectedCorrectCount() {
        UUID mapId = UUID.randomUUID();
        stubLessonLines(List.of(Map.of("contentBody", "This is a sufficiently long lesson line with meaningful vocabulary.")));
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Monster"));

        MonsterEncounterQuizResponse result = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());

        assertFalse(result.bossEncounter());
        assertEquals("normal", result.difficulty());
        assertEquals(90, result.requiredAccuracyPercent());
        assertEquals(9, result.requiredCorrectAnswers());
    }

    @Test
    void generateMonsterEncounterQuiz_FallsBackToMonsterNameWhenLookupFails() {
        UUID mapId = UUID.randomUUID();
        stubLessonLines(List.of(Map.of("contentBody", "This is a sufficiently long lesson line with meaningful vocabulary.")));
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenThrow(new RuntimeException("downstream unavailable"));

        MonsterEncounterQuizResponse result = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());

        assertEquals("monster", result.monsterName());
    }

    @Test
    void generateMonsterEncounterQuiz_HandlesNullOrBadLessonPayloadSafely() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Monster"));
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(null);

        MonsterEncounterQuizResponse nullPayload = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());
        assertEquals(10, nullPayload.questions().size());

        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(Map.of("contentBody", 123)));
        MonsterEncounterQuizResponse badPayload = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());
        assertEquals(10, badPayload.questions().size());
    }

    @Test
    void generateMonsterEncounterQuiz_UsesFallbackVocabularyWhenPoolIsWeak() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Monster"));
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(
                Map.of("contentBody", "Echo echo echo echo echo echo echo echo echo echo echo echo.")
        ));

        MonsterEncounterQuizResponse result = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());

        assertEquals(10, result.questions().size());
        assertTrue(result.questions().stream().allMatch(q -> q.options().size() == 3));
    }

    @Test
    void generateMonsterEncounterQuiz_FallsBackToLineRecallWhenNoTargetWordExists() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Monster"));
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(
                Map.of("contentBody", "123456789012345678901234567890")
        ));

        MonsterEncounterQuizResponse result = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());

        assertTrue(result.questions().stream().anyMatch(q -> q.prompt().equals("Which line best matches the lesson content?")));
    }

    @Test
    void generateMonsterEncounterQuiz_QuestionCountAlwaysMatchesConfiguration() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Monster"));
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(
                Map.of("contentBody", "This is a sufficiently long lesson line with meaningful vocabulary."),
                Map.of("contentBody", "Another sufficiently long lesson line with enough words to build questions.")
        ));

        MonsterEncounterQuizResponse result = service.generateMonsterEncounterQuiz(new MonsterEncounterQuizRequest(mapId, UUID.randomUUID(), false), UUID.randomUUID());

        assertEquals(10, result.questions().size());
        assertNotNull(result.questions().getFirst());
    }

    private void stubLessonLines(List<Map<String, Object>> payload) {
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(payload);
    }
}
