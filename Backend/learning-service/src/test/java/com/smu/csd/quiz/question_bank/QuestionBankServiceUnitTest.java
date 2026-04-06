package com.smu.csd.quiz.question_bank;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.quiz.map_quiz.MapQuiz;
import com.smu.csd.quiz.map_quiz.MapQuizOption;
import com.smu.csd.quiz.map_quiz.MapQuizOptionRepository;
import com.smu.csd.quiz.map_quiz.MapQuizQuestion;
import com.smu.csd.quiz.map_quiz.MapQuizQuestionRepository;
import com.smu.csd.quiz.map_quiz.MapQuizRepository;

public class QuestionBankServiceUnitTest {

    private BankQuestionRepository bankQuestionRepository;
    private BankQuestionOptionRepository bankOptionRepository;
    private MapQuizRepository mapQuizRepository;
    private MapQuizQuestionRepository mapQuizQuestionRepository;
    private MapQuizOptionRepository mapQuizOptionRepository;
    private ChatClient.Builder chatClientBuilder;
    private ChatClient chatClient;
    private ChatClient.ChatClientRequestSpec requestSpec;
    private ChatClient.CallResponseSpec responseSpec;
    private RestTemplate restTemplate;
    private QuestionBankService service;

    @BeforeEach
    void setUp() {
        bankQuestionRepository = mock(BankQuestionRepository.class);
        bankOptionRepository = mock(BankQuestionOptionRepository.class);
        mapQuizRepository = mock(MapQuizRepository.class);
        mapQuizQuestionRepository = mock(MapQuizQuestionRepository.class);
        mapQuizOptionRepository = mock(MapQuizOptionRepository.class);
        chatClientBuilder = mock(ChatClient.Builder.class);
        chatClient = mock(ChatClient.class);
        requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        responseSpec = mock(ChatClient.CallResponseSpec.class);
        restTemplate = mock(RestTemplate.class);

        when(chatClientBuilder.build()).thenReturn(chatClient);
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(responseSpec);

        service = new QuestionBankService(
                bankQuestionRepository,
                bankOptionRepository,
                mapQuizRepository,
                mapQuizQuestionRepository,
                mapQuizOptionRepository,
                chatClientBuilder,
                restTemplate
        );
    }

    @Test
    void generateDraft_RejectsWhenMapContentSummaryIsEmpty() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of());

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.generateDraft(mapId));

        assertTrue(exception.getMessage().contains("No approved content found"));
    }

    @Test
    void generateDraft_RejectsMalformedAiOutputWithParseError() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(Map.of(
                "npcName", "NPC",
                "contentTitle", "Title",
                "contentBody", "This is enough content for the prompt to build."
        )));
        when(responseSpec.content()).thenReturn("not-json");

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.generateDraft(mapId));

        assertTrue(exception.getMessage().contains("Failed to parse AI-generated questions"));
    }

    @Test
    void saveQuestions_RejectsUnknownMap() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenThrow(new RuntimeException("404"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.saveQuestions(mapId, List.of(new BankQuestionRequest("Scenario", false, List.of(new BankQuestionOptionRequest("A", true)))))
        );

        assertEquals("Map not found: " + mapId, exception.getMessage());
    }

    @Test
    void saveQuestions_MarksMultiSelectTrueWhenMoreThanOneCorrectOptionExists() {
        UUID mapId = UUID.randomUUID();
        BankQuestion savedQuestion = BankQuestion.builder()
                .bankQuestionId(UUID.randomUUID())
                .mapId(mapId)
                .scenarioText("Scenario")
                .status(BankQuestion.Status.PENDING_REVIEW)
                .isMultiSelect(true)
                .build();

        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(Map.of("name", "Map Name"));
        when(bankQuestionRepository.save(any(BankQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bankOptionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<BankQuestionResponse> result = service.saveQuestions(mapId, List.of(
                new BankQuestionRequest("Scenario", false, List.of(
                        new BankQuestionOptionRequest("A", true),
                        new BankQuestionOptionRequest("B", true),
                        new BankQuestionOptionRequest("C", false)
                ))
        ));

        assertEquals(1, result.size());
        assertTrue(result.get(0).isMultiSelect());
        verify(bankQuestionRepository).save(any(BankQuestion.class));
    }

    @Test
    void approveQuestion_RejectsNonPendingReviewQuestion() {
        UUID bankQuestionId = UUID.randomUUID();
        BankQuestion question = BankQuestion.builder()
                .bankQuestionId(bankQuestionId)
                .status(BankQuestion.Status.APPROVED)
                .mapId(UUID.randomUUID())
                .scenarioText("Scenario")
                .build();

        when(bankQuestionRepository.findById(bankQuestionId)).thenReturn(Optional.of(question));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.approveQuestion(bankQuestionId));

        assertEquals("Only PENDING_REVIEW questions can be approved.", exception.getMessage());
    }

    @Test
    void rejectQuestion_RejectsNonPendingReviewQuestion() {
        UUID bankQuestionId = UUID.randomUUID();
        BankQuestion question = BankQuestion.builder()
                .bankQuestionId(bankQuestionId)
                .status(BankQuestion.Status.REJECTED)
                .mapId(UUID.randomUUID())
                .scenarioText("Scenario")
                .build();

        when(bankQuestionRepository.findById(bankQuestionId)).thenReturn(Optional.of(question));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.rejectQuestion(bankQuestionId));

        assertEquals("Only PENDING_REVIEW questions can be rejected.", exception.getMessage());
    }

    @Test
    void addBankQuestionToQuiz_RejectsNonApprovedBankQuestion() {
        UUID bankQuestionId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        BankQuestion question = BankQuestion.builder()
                .bankQuestionId(bankQuestionId)
                .status(BankQuestion.Status.PENDING_REVIEW)
                .mapId(UUID.randomUUID())
                .scenarioText("Scenario")
                .build();

        when(bankQuestionRepository.findById(bankQuestionId)).thenReturn(Optional.of(question));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.addBankQuestionToQuiz(quizId, bankQuestionId)
        );

        assertEquals("Only APPROVED bank questions can be added to a quiz.", exception.getMessage());
        verify(mapQuizQuestionRepository, never()).save(any(MapQuizQuestion.class));
    }

    @Test
    void addBankQuestionToQuiz_RejectsDuplicateQuestionAlreadyInQuiz() {
        UUID bankQuestionId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();

        BankQuestion approvedBankQuestion = BankQuestion.builder()
                .bankQuestionId(bankQuestionId)
                .status(BankQuestion.Status.APPROVED)
                .mapId(UUID.randomUUID())
                .scenarioText("How should you respond in this scenario?")
                .isMultiSelect(false)
                .build();
        MapQuiz quiz = MapQuiz.builder().quizId(quizId).build();
        MapQuizQuestion existingQuestion = MapQuizQuestion.builder()
                .questionId(UUID.randomUUID())
                .quiz(quiz)
                .scenarioText(" how should you   respond in this scenario? ")
                .questionOrder(0)
                .isMultiSelect(false)
                .build();

        when(bankQuestionRepository.findById(bankQuestionId)).thenReturn(Optional.of(approvedBankQuestion));
        when(mapQuizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(mapQuizQuestionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId)).thenReturn(List.of(existingQuestion));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.addBankQuestionToQuiz(quizId, bankQuestionId)
        );

        assertEquals("This question is already in the quiz.", exception.getMessage());
        verify(mapQuizQuestionRepository, never()).save(any(MapQuizQuestion.class));
        verify(mapQuizOptionRepository, never()).save(any(MapQuizOption.class));
    }

    @Test
    void getContentSummary_MapsGameServiceContentRowsIntoSummaryDtos() {
        UUID mapId = UUID.randomUUID();
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(Map.of(
                "npcName", "Guide",
                "contentTitle", "Lesson",
                "contentBody", "Body"
        )));

        List<MapContentSummaryResponse> result = service.getContentSummary(mapId);

        assertEquals(1, result.size());
        assertEquals("Guide", result.get(0).npcName());
        assertEquals("Lesson", result.get(0).contentTitle());
        assertEquals("Body", result.get(0).contentBody());
    }

    @Test
    void getContentSummary_ReturnsEmptyListWhenGameServiceLookupThrows() {
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenThrow(new RuntimeException("down"));

        List<MapContentSummaryResponse> result = service.getContentSummary(UUID.randomUUID());

        assertTrue(result.isEmpty());
    }

    @Test
    void updateQuestion_ReplacesOldOptionsAndRecomputesIsMultiSelect() {
        UUID bankQuestionId = UUID.randomUUID();
        UUID mapId = UUID.randomUUID();
        BankQuestion question = BankQuestion.builder()
                .bankQuestionId(bankQuestionId)
                .mapId(mapId)
                .scenarioText("Old")
                .status(BankQuestion.Status.PENDING_REVIEW)
                .isMultiSelect(false)
                .build();

        when(bankQuestionRepository.findById(bankQuestionId)).thenReturn(Optional.of(question));
        when(bankQuestionRepository.save(any(BankQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bankOptionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenThrow(new RuntimeException("missing"));

        BankQuestionResponse result = service.updateQuestion(bankQuestionId, new BankQuestionRequest(
                "Updated scenario",
                false,
                List.of(
                        new BankQuestionOptionRequest("A", true),
                        new BankQuestionOptionRequest("B", true),
                        new BankQuestionOptionRequest("C", false)
                )
        ));

        assertEquals("Updated scenario", result.scenarioText());
        assertTrue(result.isMultiSelect());
        assertEquals("Map " + mapId, result.mapName());
        verify(bankOptionRepository).deleteByBankQuestion_BankQuestionId(bankQuestionId);
        verify(bankOptionRepository).saveAll(any());
    }

    @Test
    void getAllBankQuestions_ReturnsQuestionResponsesWithOptionPayloadsAndMapNameFallbackApplied() {
        UUID mapId = UUID.randomUUID();
        UUID bankQuestionId = UUID.randomUUID();
        BankQuestion question = BankQuestion.builder()
                .bankQuestionId(bankQuestionId)
                .mapId(mapId)
                .scenarioText("Scenario")
                .status(BankQuestion.Status.APPROVED)
                .isMultiSelect(false)
                .build();
        BankQuestionOption option = BankQuestionOption.builder()
                .bankOptionId(UUID.randomUUID())
                .bankQuestion(question)
                .optionText("Option A")
                .isCorrect(true)
                .build();

        when(bankQuestionRepository.findAll()).thenReturn(List.of(question));
        when(bankOptionRepository.findByBankQuestion_BankQuestionId(bankQuestionId)).thenReturn(List.of(option));
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenThrow(new RuntimeException("missing"));

        List<BankQuestionResponse> result = service.getAllBankQuestions();

        assertEquals(1, result.size());
        assertEquals("Map " + mapId, result.get(0).mapName());
        assertEquals(1, result.get(0).options().size());
        assertEquals("Option A", result.get(0).options().get(0).optionText());
    }
}
