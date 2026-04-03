package com.smu.csd.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.client.ChatClient;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.quiz.map_quiz.MapQuizOption;
import com.smu.csd.quiz.map_quiz.MapQuizOptionRepository;

class AIServiceUnitTest {

    private AIModerationResultRepository moderationRepository;
    private ContentRepository contentRepository;
    private MapQuizOptionRepository mapQuizOptionRepository;
    private ChatClient.Builder chatClientBuilder;
    private ChatClient chatClient;
    private ChatClient.ChatClientRequestSpec requestSpec;
    private ChatClient.CallResponseSpec responseSpec;
    private AIService service;

    @BeforeEach
    void setUp() {
        moderationRepository = mock(AIModerationResultRepository.class);
        contentRepository = mock(ContentRepository.class);
        mapQuizOptionRepository = mock(MapQuizOptionRepository.class);
        chatClientBuilder = mock(ChatClient.Builder.class);
        chatClient = mock(ChatClient.class);
        requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        responseSpec = mock(ChatClient.CallResponseSpec.class);

        when(chatClientBuilder.build()).thenReturn(chatClient);
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(responseSpec);

        service = new AIService(chatClientBuilder, moderationRepository, contentRepository, mapQuizOptionRepository);
    }

    @Test
    void generateBody_StripsMarkdownCodeFencesFromAiOutput() {
        when(responseSpec.content()).thenReturn("```json\n[\"line 1\", \"line 2\"]\n```");

        String result = service.generateBody("Topic", "Title", "Description");

        assertEquals("[\"line 1\", \"line 2\"]", result);
    }

    @Test
    void generateBody_RemovesTrailingCommasBeforeClosingJsonDelimiters() {
        when(responseSpec.content()).thenReturn("[\"line 1\",]");

        String result = service.generateBody("Topic", "Title", "Description");

        assertEquals("[\"line 1\"]", result);
    }

    @Test
    void screenContent_SavesModerationResultAndApprovesContentWhenVerdictIsApproved() {
        Content content = content();
        stubEntityResponse(createModerationResponse(9, true, true, AIModerationResult.Verdict.APPROVED, "good"));

        service.screenContent(content);

        ArgumentCaptor<AIModerationResult> captor = ArgumentCaptor.forClass(AIModerationResult.class);
        verify(moderationRepository).save(captor.capture());
        assertEquals(AIModerationResult.Verdict.APPROVED, captor.getValue().getAiVerdict());
        assertEquals("good", captor.getValue().getReasoning());
        assertEquals(Content.Status.APPROVED, content.getStatus());
        verify(contentRepository).save(content);
    }

    @Test
    void screenContent_SavesModerationResultAndRejectsContentWhenVerdictIsRejected() {
        Content content = content();
        stubEntityResponse(createModerationResponse(2, true, false, AIModerationResult.Verdict.REJECTED, "bad"));

        service.screenContent(content);

        ArgumentCaptor<AIModerationResult> captor = ArgumentCaptor.forClass(AIModerationResult.class);
        verify(moderationRepository).save(captor.capture());
        assertEquals(AIModerationResult.Verdict.REJECTED, captor.getValue().getAiVerdict());
        assertEquals(Content.Status.REJECTED, content.getStatus());
        verify(contentRepository).save(content);
    }

    @Test
    void screenContent_LeavesContentInReviewStateWhenVerdictIsNeedsReview() {
        Content content = content();
        content.setStatus(Content.Status.PENDING_REVIEW);
        stubEntityResponse(createModerationResponse(6, true, true, AIModerationResult.Verdict.NEEDS_REVIEW, "borderline"));

        service.screenContent(content);

        verify(moderationRepository).save(any(AIModerationResult.class));
        assertEquals(Content.Status.PENDING_REVIEW, content.getStatus());
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void screenContent_FallsBackToNeedsReviewModerationResultWhenAiParsingThrows() {
        Content content = content();
        when(responseSpec.entity(any(Class.class))).thenThrow(new IllegalStateException("boom"));

        service.screenContent(content);

        ArgumentCaptor<AIModerationResult> captor = ArgumentCaptor.forClass(AIModerationResult.class);
        verify(moderationRepository).save(captor.capture());
        assertEquals(AIModerationResult.Verdict.NEEDS_REVIEW, captor.getValue().getAiVerdict());
        assertTrue(captor.getValue().getReasoning().contains("boom"));
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void reviewReflection_ReturnsAiVerdictAndNoteOnSuccessfulParse() {
        stubEntityResponse(createReflectionResponse(88, "APPROVED", "specific and thoughtful"));

        AIService.ReflectionReviewResult result = service.reviewReflection("Mission", "Desc", "Reflection");

        assertEquals("APPROVED", result.verdict());
        assertEquals("specific and thoughtful", result.note());
    }

    @Test
    void reviewReflection_FallsBackToFlaggedForReviewWhenAiParsingThrows() {
        when(responseSpec.entity(any(Class.class))).thenThrow(new IllegalArgumentException("bad json"));

        AIService.ReflectionReviewResult result = service.reviewReflection("Mission", "Desc", "Reflection");

        assertEquals("FLAGGED_FOR_REVIEW", result.verdict());
        assertTrue(result.note().contains("bad json"));
    }

    @Test
    void generateQuizHint_ReturnsFallbackHintWhenPromptIsBlankOrOptionsAreInsufficient() {
        QuizHintResponse result = service.generateQuizHint(new QuizHintRequest("  ", List.of("Only one"), "single", List.of(0), null, null, null));

        assertEquals("Look for the option that best aligns with the main idea in the question.", result.hintText());
        assertEquals("LIGHT", result.hintStrength());
        assertFalse(result.alreadyUsedForQuestion());
    }

    @Test
    void generateQuizHint_ResolvesCorrectOptionIndexesFromDbOptionsWhenQuestionIdIsProvided() {
        UUID questionId = UUID.randomUUID();
        when(mapQuizOptionRepository.findByQuestion_QuestionId(questionId)).thenReturn(List.of(
                MapQuizOption.builder().optionText("Wrong").isCorrect(false).build(),
                MapQuizOption.builder().optionText(" Correct Answer ").isCorrect(true).build()
        ));
        when(responseSpec.content()).thenReturn("Focus on the option tied to the main concept.");

        QuizHintResponse result = service.generateQuizHint(new QuizHintRequest(
                "Question prompt",
                List.of("wrong", "correct answer"),
                "single",
                List.of(0),
                null,
                null,
                questionId
        ));

        assertEquals("Focus on the option tied to the main concept.", result.hintText());
        verify(mapQuizOptionRepository).findByQuestion_QuestionId(questionId);
    }

    @Test
    void generateQuizHint_FallsBackToCallerSuppliedCorrectIndexesWhenDbOptionsAreUnavailable() {
        UUID questionId = UUID.randomUUID();
        when(mapQuizOptionRepository.findByQuestion_QuestionId(questionId)).thenReturn(List.of());
        when(responseSpec.content()).thenReturn("Use elimination and compare each choice to the scenario.");

        QuizHintResponse result = service.generateQuizHint(new QuizHintRequest(
                "Question prompt",
                List.of("Alpha", "Beta", "Gamma"),
                "multi",
                List.of(2, 2, 5, -1),
                null,
                null,
                questionId
        ));

        assertEquals("Use elimination and compare each choice to the scenario.", result.hintText());
        verify(mapQuizOptionRepository).findByQuestion_QuestionId(questionId);
    }

    @Test
    void generateQuizHint_RejectsAnswerLeakingAiHintsAndFallsBackToSafeHint() {
        when(responseSpec.content()).thenReturn("The correct answer is option B.");

        QuizHintResponse result = service.generateQuizHint(new QuizHintRequest(
                "What fits best?",
                List.of("Alpha", "Beta", "Gamma"),
                "single",
                List.of(1),
                null,
                null,
                null
        ));

        assertEquals(
                "Eliminate choices that are too absolute or off-topic, then pick the one closest to the core concept.",
                result.hintText()
        );
    }

    private Content content() {
        return Content.builder()
                .contentId(UUID.randomUUID())
                .topic(Topic.builder().topicId(UUID.randomUUID()).topicName("Slang").description("desc").build())
                .title("Title")
                .body("[\"line\"]")
                .status(Content.Status.PENDING_REVIEW)
                .build();
    }

    private void stubEntityResponse(Object response) {
        when(responseSpec.entity(any(Class.class))).thenAnswer(invocation -> response);
    }

    private Object createModerationResponse(
            int qualityScore,
            boolean relevant,
            boolean appropriate,
            AIModerationResult.Verdict verdict,
            String reasoning
    ) {
        try {
            Class<?> type = Class.forName("com.smu.csd.ai.AIService$ModerationResponse");
            Constructor<?> constructor = type.getDeclaredConstructor(int.class, boolean.class, boolean.class, AIModerationResult.Verdict.class, String.class);
            constructor.setAccessible(true);
            return constructor.newInstance(qualityScore, relevant, appropriate, verdict, reasoning);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Object createReflectionResponse(int confidence, String verdict, String note) {
        try {
            Class<?> type = Class.forName("com.smu.csd.ai.AIService$ReflectionReviewResponse");
            Constructor<?> constructor = type.getDeclaredConstructor(int.class, String.class, String.class);
            constructor.setAccessible(true);
            return constructor.newInstance(confidence, verdict, note);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
