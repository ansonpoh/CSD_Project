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
}
