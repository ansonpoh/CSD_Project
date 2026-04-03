package com.smu.csd.quiz.map_quiz;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.LearnerDto;

public class MapQuizServiceUnitTest {

    private MapQuizService service;
    private MapQuizRepository quizRepository;
    private MapQuizQuestionRepository questionRepository;
    private MapQuizOptionRepository optionRepository;
    private LearnerMapQuizAttemptRepository attemptRepository;
    private RestTemplate restTemplate;

    @BeforeEach
    public void setUp() {
        quizRepository = mock(MapQuizRepository.class);
        questionRepository = mock(MapQuizQuestionRepository.class);
        optionRepository = mock(MapQuizOptionRepository.class);
        attemptRepository = mock(LearnerMapQuizAttemptRepository.class);
        restTemplate = mock(RestTemplate.class);
        service = new MapQuizService(quizRepository, questionRepository, optionRepository, attemptRepository, restTemplate);
    }

    @Test
    public void testCreateQuizSuccess_MapExists() {
        UUID mapId = UUID.randomUUID();
        MapQuizCreateRequest request = new MapQuizCreateRequest(mapId, "Test Quiz", "Description");

        MapQuiz quiz = MapQuiz.builder()
                .quizId(UUID.randomUUID())
                .mapId(mapId)
                .title("Test Quiz")
                .isPublished(false)
                .build();

        when(restTemplate.getForObject(anyString(), eq(java.util.Map.class))).thenReturn(java.util.Map.of());
        when(quizRepository.findByMapId(mapId)).thenReturn(java.util.Optional.empty());
        when(quizRepository.save(any(MapQuiz.class))).thenReturn(quiz);

        MapQuizResponse result = service.createQuiz(request);

        assertNotNull(result);
        assertEquals("Test Quiz", result.title());
        verify(quizRepository).save(any(MapQuiz.class));
    }

    @Test
    public void testCreateQuiz_MapNotFound() {
        UUID mapId = UUID.randomUUID();
        MapQuizCreateRequest request = new MapQuizCreateRequest(mapId, "Test Quiz", "Description");

        when(restTemplate.getForObject(anyString(), eq(java.util.Map.class)))
                .thenThrow(new RuntimeException("404 Not Found"));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            service.createQuiz(request)
        );
        assertTrue(exception.getMessage().contains("Map not found"));
    }

    @Test
    public void testCreateQuiz_DuplicateQuizForMap() {
        UUID mapId = UUID.randomUUID();
        MapQuizCreateRequest request = new MapQuizCreateRequest(mapId, "Test Quiz", "Description");
        MapQuiz existingQuiz = MapQuiz.builder().quizId(UUID.randomUUID()).mapId(mapId).build();

        when(restTemplate.getForObject(anyString(), eq(java.util.Map.class))).thenReturn(java.util.Map.of());
        when(quizRepository.findByMapId(mapId)).thenReturn(java.util.Optional.of(existingQuiz));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            service.createQuiz(request)
        );
        assertTrue(exception.getMessage().contains("already exists"));
    }

    @Test
    public void testAddQuestionSuccess() {
        UUID quizId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).mapId(UUID.randomUUID()).build();

        MapQuizQuestionRequest request = new MapQuizQuestionRequest(
                "Scenario text", 1, false,
                Arrays.asList(new MapQuizOptionRequest("Option A", true), new MapQuizOptionRequest("Option B", false))
        );

        MapQuizQuestion question = MapQuizQuestion.builder()
                .questionId(UUID.randomUUID())
                .quiz(quiz)
                .scenarioText("Scenario text")
                .build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(questionRepository.save(any(MapQuizQuestion.class))).thenReturn(question);
        when(optionRepository.save(any(MapQuizOption.class))).thenAnswer(i -> i.getArguments()[0]);

        MapQuizResponse result = service.addQuestion(quizId, request);

        assertNotNull(result);
        verify(questionRepository).save(any(MapQuizQuestion.class));
        verify(optionRepository, times(2)).save(any(MapQuizOption.class));
    }

    @Test
    public void testAddQuestion_QuizNotFound() {
        UUID quizId = UUID.randomUUID();
        MapQuizQuestionRequest request = new MapQuizQuestionRequest("Scenario", 1, false, List.of());

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            service.addQuestion(quizId, request)
        );
        assertTrue(exception.getMessage().contains("Quiz not found"));
    }

    @Test
    public void testPublishQuizSuccess() {
        UUID quizId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(false).build();
        MapQuizQuestion question = MapQuizQuestion.builder().questionId(UUID.randomUUID()).quiz(quiz).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId)).thenReturn(Arrays.asList(question));
        when(quizRepository.save(quiz)).thenReturn(quiz);

        MapQuizResponse result = service.publishQuiz(quizId);

        assertTrue(result.isPublished());
        verify(quizRepository).save(quiz);
    }

    @Test
    public void testPublishQuiz_NoQuestions() {
        UUID quizId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(false).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId)).thenReturn(List.of());

        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            service.publishQuiz(quizId)
        );
        assertTrue(exception.getMessage().contains("no questions"));
    }

    @Test
    public void testUnpublishQuizSuccess() {
        UUID quizId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(true).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(quizRepository.save(quiz)).thenReturn(quiz);

        MapQuizResponse result = service.unpublishQuiz(quizId);

        assertFalse(result.isPublished());
    }

    @Test
    public void testUnpublishQuiz_AlreadyUnpublished() {
        UUID quizId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(false).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            service.unpublishQuiz(quizId)
        );
        assertTrue(exception.getMessage().contains("not published"));
    }

    @Test
    public void testRemoveQuestionSuccess() {
        UUID quizId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(false).build();
        MapQuizQuestion question = MapQuizQuestion.builder().questionId(questionId).quiz(quiz).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(questionRepository.findById(questionId)).thenReturn(java.util.Optional.of(question));
        doNothing().when(optionRepository).deleteByQuestion_QuestionId(questionId);
        doNothing().when(questionRepository).deleteById(questionId);

        MapQuizResponse result = service.removeQuestion(quizId, questionId);

        assertNotNull(result);
        verify(optionRepository).deleteByQuestion_QuestionId(questionId);
        verify(questionRepository).deleteById(questionId);
    }

    @Test
    public void testRemoveQuestion_FromPublishedQuiz() {
        UUID quizId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(true).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            service.removeQuestion(quizId, questionId)
        );
        assertTrue(exception.getMessage().contains("Cannot remove questions from a published quiz"));
    }

    @Test
    public void testGetQuizForLearner_NpcsNotCompleted() {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(restTemplate.getForObject(anyString(), eq(Boolean.class))).thenReturn(false);

        IllegalStateException exception = assertThrows(IllegalStateException.class, () ->
            service.getQuizForLearner(userId, mapId)
        );
        assertTrue(exception.getMessage().contains("must interact with all NPCs"));
    }

    @Test
    public void testGetQuizForLearner_NoPublishedQuiz() {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(restTemplate.getForObject(anyString(), eq(Boolean.class))).thenReturn(true);
        when(quizRepository.findByMapIdAndIsPublishedTrue(mapId)).thenReturn(java.util.Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            service.getQuizForLearner(userId, mapId)
        );
        assertTrue(exception.getMessage().contains("No published quiz"));
    }

    @Test
    public void testSubmitAttempt_PassingScore() {
        UUID userId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        MapQuiz quiz = MapQuiz.builder().quizId(quizId).mapId(UUID.randomUUID()).build();
        MapQuizQuestion question = MapQuizQuestion.builder().questionId(UUID.randomUUID()).quiz(quiz).build();
        MapQuizOption correctOption = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();

        MapQuizSubmitRequest request = new MapQuizSubmitRequest(
                quizId,
                Arrays.asList(new MapQuizAnswerRequest(question.getQuestionId(), Arrays.asList(correctOption.getOptionId())))
        );

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(restTemplate.getForObject(anyString(), eq(Boolean.class))).thenReturn(true);
        when(questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId)).thenReturn(Arrays.asList(question));
        when(optionRepository.findByQuestion_QuestionId(question.getQuestionId())).thenReturn(Arrays.asList(correctOption));
        when(attemptRepository.save(any(LearnerMapQuizAttempt.class))).thenAnswer(i -> i.getArguments()[0]);

        MapQuizSubmitResponse result = service.submitAttempt(userId, request);

        assertTrue(result.passed());
        assertEquals(1, result.score());
    }

    @Test
    public void testSubmitAttempt_FailingScore() {
        UUID userId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        MapQuiz quiz = MapQuiz.builder().quizId(quizId).mapId(UUID.randomUUID()).build();
        MapQuizQuestion question = MapQuizQuestion.builder().questionId(UUID.randomUUID()).quiz(quiz).build();
        MapQuizOption wrongOption = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(false).build();
        MapQuizOption correctOption = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();

        MapQuizSubmitRequest request = new MapQuizSubmitRequest(
                quizId,
                Arrays.asList(new MapQuizAnswerRequest(question.getQuestionId(), Arrays.asList(wrongOption.getOptionId())))
        );

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(restTemplate.getForObject(anyString(), eq(Boolean.class))).thenReturn(true);
        when(questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId)).thenReturn(Arrays.asList(question));
        when(optionRepository.findByQuestion_QuestionId(question.getQuestionId())).thenReturn(Arrays.asList(correctOption, wrongOption));
        when(attemptRepository.save(any(LearnerMapQuizAttempt.class))).thenAnswer(i -> i.getArguments()[0]);

        MapQuizSubmitResponse result = service.submitAttempt(userId, request);

        assertFalse(result.passed());
        assertEquals(0, result.score());
    }

    @Test
    public void testSubmitAttempt_MultiSelectRequiresExactMatch() {
        UUID userId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        MapQuiz quiz = MapQuiz.builder().quizId(quizId).mapId(UUID.randomUUID()).build();
        UUID questionId = UUID.randomUUID();
        MapQuizQuestion question = MapQuizQuestion.builder()
                .questionId(questionId)
                .quiz(quiz)
                .isMultiSelect(true)
                .build();

        MapQuizOption correctA = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();
        MapQuizOption correctB = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();
        MapQuizOption wrong = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(false).build();

        MapQuizSubmitRequest partialRequest = new MapQuizSubmitRequest(
                quizId,
                List.of(new MapQuizAnswerRequest(questionId, List.of(correctA.getOptionId())))
        );

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(optionRepository.findByQuestion_QuestionId(questionId)).thenReturn(List.of(correctA, correctB, wrong));
        when(attemptRepository.save(any(LearnerMapQuizAttempt.class))).thenAnswer(i -> i.getArguments()[0]);

        MapQuizSubmitResponse partialResult = service.submitAttempt(userId, partialRequest);

        assertFalse(partialResult.passed());
        assertEquals(0, partialResult.score());

        MapQuizSubmitRequest exactRequest = new MapQuizSubmitRequest(
                quizId,
                List.of(new MapQuizAnswerRequest(questionId, List.of(correctA.getOptionId(), correctB.getOptionId())))
        );

        MapQuizSubmitResponse exactResult = service.submitAttempt(userId, exactRequest);

        assertTrue(exactResult.passed());
        assertEquals(1, exactResult.score());
    }

    @Test
    public void testSubmitAttempt_PartialCorrectAcrossQuestions() {
        UUID userId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        MapQuiz quiz = MapQuiz.builder().quizId(quizId).mapId(UUID.randomUUID()).build();

        UUID q1 = UUID.randomUUID();
        UUID q2 = UUID.randomUUID();
        UUID q3 = UUID.randomUUID();
        MapQuizQuestion question1 = MapQuizQuestion.builder().questionId(q1).quiz(quiz).build();
        MapQuizQuestion question2 = MapQuizQuestion.builder().questionId(q2).quiz(quiz).build();
        MapQuizQuestion question3 = MapQuizQuestion.builder().questionId(q3).quiz(quiz).build();

        MapQuizOption q1Correct = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();
        MapQuizOption q2Correct = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();
        MapQuizOption q2Wrong = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(false).build();
        MapQuizOption q3Correct = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(true).build();
        MapQuizOption q3Wrong = MapQuizOption.builder().optionId(UUID.randomUUID()).isCorrect(false).build();

        MapQuizSubmitRequest request = new MapQuizSubmitRequest(
                quizId,
                List.of(
                        new MapQuizAnswerRequest(q1, List.of(q1Correct.getOptionId())),
                        new MapQuizAnswerRequest(q2, List.of(q2Wrong.getOptionId())),
                        new MapQuizAnswerRequest(q3, List.of(q3Correct.getOptionId()))
                )
        );

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(optionRepository.findByQuestion_QuestionId(q1)).thenReturn(List.of(q1Correct));
        when(optionRepository.findByQuestion_QuestionId(q2)).thenReturn(List.of(q2Correct, q2Wrong));
        when(optionRepository.findByQuestion_QuestionId(q3)).thenReturn(List.of(q3Correct, q3Wrong));
        when(attemptRepository.save(any(LearnerMapQuizAttempt.class))).thenAnswer(i -> i.getArguments()[0]);

        MapQuizSubmitResponse result = service.submitAttempt(userId, request);

        assertEquals(2, result.score());
        assertEquals(3, result.totalQuestions());
        assertFalse(result.passed());
    }

    @Test
    public void testHasPassedQuiz_NoPublishedQuiz() {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(learner);
        when(quizRepository.findByMapIdAndIsPublishedTrue(mapId)).thenReturn(java.util.Optional.empty());

        boolean result = service.hasPassedQuiz(userId, mapId);

        assertTrue(result); // no quiz = no gate
    }

    @Test
    public void testGetQuizForLearner_LearnerNotFound() {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();

        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(null);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            service.getQuizForLearner(userId, mapId)
        );
        assertTrue(exception.getMessage().contains("Learner not found"));
    }

    @Test
    public void testGetQuizForLearner_PreservesQuestionOrdering() {
        UUID userId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        LearnerDto learner = new LearnerDto(UUID.randomUUID(), 0, 1);

        MapQuiz quiz = MapQuiz.builder().quizId(quizId).mapId(mapId).title("Ordered Quiz").isPublished(true).build();
        MapQuizQuestion first = MapQuizQuestion.builder()
                .questionId(UUID.randomUUID())
                .quiz(quiz)
                .questionOrder(1)
                .scenarioText("First")
                .build();
        MapQuizQuestion second = MapQuizQuestion.builder()
                .questionId(UUID.randomUUID())
                .quiz(quiz)
                .questionOrder(2)
                .scenarioText("Second")
                .build();

        when(restTemplate.getForObject(contains("/api/internal/learners/supabase/"), eq(LearnerDto.class)))
                .thenReturn(learner);
        when(restTemplate.getForObject(contains("/api/internal/encounters/all-npcs-completed"), eq(Boolean.class)))
                .thenReturn(true);
        when(quizRepository.findByMapIdAndIsPublishedTrue(mapId)).thenReturn(java.util.Optional.of(quiz));
        when(questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId)).thenReturn(List.of(first, second));
        when(optionRepository.findByQuestion_QuestionId(any(UUID.class))).thenReturn(List.of());

        MapQuizResponse response = service.getQuizForLearner(userId, mapId);

        assertEquals(2, response.questions().size());
        assertEquals(1, response.questions().get(0).questionOrder());
        assertEquals(2, response.questions().get(1).questionOrder());
    }

    @Test
    public void testUnpublishQuiz_DoesNotTouchLearnerAttempts() {
        UUID quizId = UUID.randomUUID();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).isPublished(true).build();

        when(quizRepository.findById(quizId)).thenReturn(java.util.Optional.of(quiz));
        when(quizRepository.save(quiz)).thenReturn(quiz);

        MapQuizResponse result = service.unpublishQuiz(quizId);

        assertFalse(result.isPublished());
        verifyNoInteractions(attemptRepository);
    }
}
