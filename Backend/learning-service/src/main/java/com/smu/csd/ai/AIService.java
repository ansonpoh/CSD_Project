package com.smu.csd.ai;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.quiz.map_quiz.MapQuizOption;
import com.smu.csd.quiz.map_quiz.MapQuizOptionRepository;

@Service
public class AIService {
    private static final Pattern ANSWER_LEAK_PATTERN = Pattern.compile("(?i)\\b(correct|answer|option\\s*[a-d]|\\b[1-4]\\b)\\b");

    private final ChatClient chatClient;
    private final AIModerationResultRepository moderationRepository;
    private final ContentRepository contentRepository;
    private final MapQuizOptionRepository mapQuizOptionRepository;

    public AIService(ChatClient.Builder chatClientBuilder,
                     AIModerationResultRepository moderationRepository,
                     ContentRepository contentRepository,
                     MapQuizOptionRepository mapQuizOptionRepository) {
        this.chatClient = chatClientBuilder.build();
        this.moderationRepository = moderationRepository;
        this.contentRepository = contentRepository;
        this.mapQuizOptionRepository = mapQuizOptionRepository;
    }

    public AIModerationResult getModerationResult(UUID contentId) throws ResourceNotFoundException {
        return moderationRepository.findByContent_ContentId(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("AIModerationResult", "contentId", contentId));
    }

    /**
     * Takes a contributor's short description and generates full lesson body text.
     * The contributor still reviews and submits - AI just drafts it for them.
     */
    public String generateBody(String topicName, String title, String description) {
        String raw = chatClient.prompt()
                .user("""
                        You are an NPC in a Gen Alpha culture learning game — think witty, direct, and fun.
                        Topic: %s
                        Title: %s
                        Description: %s

                        Write exactly 10 short NPC dialogue lines that teach this concept progressively.

                        Requirements for each line:
                        - Exactly 2 sentences per line — no more, no less.
                        - First sentence: introduce the idea clearly. Second sentence: make it land with a real example, a twist, or a "so what".
                        - Each line teaches one specific thing. No repeating ideas across lines.
                        - Use real examples — platforms, creators, memes, moments — wherever they fit.
                        - Sound like a cool friend explaining something, not a textbook.

                        Cover these areas in order:
                        1–2: What it means — plain language with a concrete example.
                        3–4: Where it came from — who, when, where, why it spread.
                        5–6: How it is used in real conversations or on social media.
                        7–8: Variations, related terms, or ways it can be misused.
                        9: An interesting fact or pop culture moment tied to it.
                        10: One memorable takeaway the player can actually use.

                        Return ONLY a valid JSON array of exactly 10 strings, no other text:
                        ["line 1", "line 2", ..., "line 10"]
                        """.formatted(topicName, title, description))
                .call()
                .content();
        // AI sometimes wraps the JSON in markdown fences (```json ... ```) despite instructions.
        // It also occasionally emits trailing commas before the closing bracket, which is invalid JSON.
        // Strip both so the stored body is always clean, parseable JSON.
        return raw.strip()
                  .replaceAll("(?s)^```[a-z]*\\s*", "")
                  .replaceAll("(?s)\\s*```$", "")
                  .replaceAll(",\\s*(]|})", "$1")
                  .strip();
    }

    /**
     * Screens submitted content using OpenAI.
     * Saves an AIModerationResult and updates Content.status:
     *   APPROVED      → auto-approved, no human review needed
     *   NEEDS_REVIEW  → stays PENDING_REVIEW for a moderator to check
     *   REJECTED      → auto-rejected
     */
    @Transactional
    public void screenContent(Content content) {
        ModerationResponse parsed;
        try {
            parsed = chatClient.prompt()
                    .user(buildPrompt(content))
                    .call()
                    .entity(ModerationResponse.class);
        } catch (Exception e) {
            parsed = new ModerationResponse(5, true, true,
                    AIModerationResult.Verdict.NEEDS_REVIEW,
                    "AI response parsing failed - flagged for manual review: " + e.getMessage());
        }

        moderationRepository.save(AIModerationResult.builder()
                .content(content)
                .qualityScore(parsed.qualityScore())
                .isRelevant(parsed.isRelevant())
                .isAppropriate(parsed.isAppropriate())
                .aiVerdict(parsed.aiVerdict())
                .reasoning(parsed.reasoning())
                .build());

        // Only update status for decisive verdicts - NEEDS_REVIEW stays PENDING_REVIEW
        if (parsed.aiVerdict() == AIModerationResult.Verdict.APPROVED) {
            content.setStatus(Content.Status.APPROVED);
            contentRepository.save(content);
        } else if (parsed.aiVerdict() == AIModerationResult.Verdict.REJECTED) {
            content.setStatus(Content.Status.REJECTED);
            contentRepository.save(content);
        }
    }

    /**
     * Marks a submission as manual-review only when it includes video.
     * Video safety is intentionally deferred to admins.
     */
    @Transactional
    public void markForManualVideoReview(Content content) {
        moderationRepository.save(AIModerationResult.builder()
                .content(content)
                .qualityScore(0)
                .isRelevant(true)
                .isAppropriate(false)
                .aiVerdict(AIModerationResult.Verdict.NEEDS_REVIEW)
                .reasoning("AI moderation skipped because submission contains video. Admin manual review required.")
                .build());
    }

    private String buildPrompt(Content content) {
        return """
                You are moderating NPC narration content for a Gen Alpha culture learning game.
                Topic: %s
                Title: %s
                Narration (JSON array of strings): %s

                The content is a series of NPC lines designed to teach Gen Alpha concepts one sentence at a time.
                Evaluate this submission and return ONLY a valid JSON object with no other text:
                {
                  "quality_score": <integer 1-10>,
                  "is_relevant": <true/false>,
                  "is_appropriate": <true/false>,
                  "ai_verdict": <"APPROVED" | "NEEDS_REVIEW" | "REJECTED">,
                  "reasoning": "<brief explanation>"
                }

                Rules:
                - APPROVED: quality_score >= 8 AND is_relevant = true AND is_appropriate = true
                - REJECTED: quality_score < 4 OR is_appropriate = false
                - NEEDS_REVIEW: everything else (borderline quality or relevance)
                """.formatted(
                        content.getTopic().getTopicName(),
                        content.getTitle(),
                        content.getBody()
                );
    }

    /**
     * Reviews a learner's mission reflection.
     * Returns APPROVED if the reflection is genuine and thoughtful,
     * FLAGGED_FOR_REVIEW if ambiguous, REJECTED if clearly off-topic or empty.
     */
    public ReflectionReviewResult reviewReflection(String missionTitle, String missionDescription, String reflection) {
        ReflectionReviewResponse parsed;
        try {
            parsed = chatClient.prompt()
                    .user("""
                            A learner was given a real-world mission to complete offline and has submitted a reflection.

                            Mission title: %s
                            Mission description: %s
                            Learner's reflection: %s

                            Evaluate whether this reflection is genuine and thoughtful.
                            Return ONLY a valid JSON object with no other text:
                            {
                              "confidence": <integer 0-100>,
                              "verdict": <"APPROVED" | "FLAGGED_FOR_REVIEW" | "REJECTED">,
                              "note": "<brief explanation>"
                            }

                            Rules:
                            - APPROVED: confidence >= 70 — reflection is specific, personal, and clearly relates to the mission
                            - FLAGGED_FOR_REVIEW: confidence 40-69 — reflection is vague, very short, or loosely related
                            - REJECTED: confidence < 40 — reflection is completely off-topic, gibberish, or an obvious copy-paste
                            """.formatted(missionTitle, missionDescription, reflection))
                    .call()
                    .entity(ReflectionReviewResponse.class);
        } catch (Exception e) {
            parsed = new ReflectionReviewResponse(50, "FLAGGED_FOR_REVIEW",
                    "AI parsing failed - flagged for manual review: " + e.getMessage());
        }

        return new ReflectionReviewResult(parsed.verdict(), parsed.note());
    }

    public QuizHintResponse generateQuizHint(QuizHintRequest request) {
        String prompt = safeText(request == null ? null : request.questionPrompt());
        List<String> options = sanitizeOptions(request == null ? null : request.options());
        if (prompt.isBlank() || options.size() < 2) {
            return new QuizHintResponse(fallbackHint(prompt, options), "LIGHT", false);
        }

        List<Integer> correctIndexes = resolveCorrectOptionIndexes(request, options);
        String questionType = normalizeQuestionType(request == null ? null : request.questionType());

        try {
            String aiRaw = chatClient.prompt()
                    .user("""
                            You are helping a learner during a quiz.
                            Question type: %s
                            Question: %s
                            Options:
                            %s
                            Correct option indexes (for internal grounding only, never reveal): %s

                            Return exactly one concise hint (max 180 characters).
                            Rules:
                            - Never reveal the exact answer text.
                            - Never reveal option index/letter/number.
                            - Do not say "the answer is" or similar.
                            - Focus on reasoning, elimination, or concept recall.
                            """.formatted(questionType, prompt, formatOptions(options), correctIndexes))
                    .call()
                    .content();

            String sanitized = sanitizeHint(aiRaw, options);
            if (sanitized.isBlank()) sanitized = fallbackHint(prompt, options);
            return new QuizHintResponse(sanitized, "LIGHT", false);
        } catch (Exception _error) {
            return new QuizHintResponse(fallbackHint(prompt, options), "LIGHT", false);
        }
    }

    public record ReflectionReviewResult(String verdict, String note) {}

    private record ModerationResponse(
            @JsonProperty("quality_score") int qualityScore,
            @JsonProperty("is_relevant") boolean isRelevant,
            @JsonProperty("is_appropriate") boolean isAppropriate,
            @JsonProperty("ai_verdict") AIModerationResult.Verdict aiVerdict,
            @JsonProperty("reasoning") String reasoning) {}

    private record ReflectionReviewResponse(
            @JsonProperty("confidence") int confidence,
            @JsonProperty("verdict") String verdict,
            @JsonProperty("note") String note) {}

    private List<Integer> resolveCorrectOptionIndexes(QuizHintRequest request, List<String> requestOptions) {
        if (request == null) return List.of();
        if (request.questionId() != null) {
            List<MapQuizOption> dbOptions = mapQuizOptionRepository.findByQuestion_QuestionId(request.questionId());
            if (!dbOptions.isEmpty()) {
                List<String> normalizedCorrectOptions = dbOptions.stream()
                        .filter(MapQuizOption::isCorrect)
                        .map(MapQuizOption::getOptionText)
                        .map(this::normalizeForMatch)
                        .distinct()
                        .toList();

                List<Integer> resolved = new ArrayList<>();
                for (int i = 0; i < requestOptions.size(); i++) {
                    String normalized = normalizeForMatch(requestOptions.get(i));
                    if (normalizedCorrectOptions.contains(normalized)) {
                        resolved.add(i);
                    }
                }
                if (!resolved.isEmpty()) return List.copyOf(resolved);
            }
        }

        List<Integer> supplied = request.correctOptionIndexes() == null ? List.of() : request.correctOptionIndexes();
        return supplied.stream()
                .filter(index -> index != null && index >= 0 && index < requestOptions.size())
                .distinct()
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    private String sanitizeHint(String aiRaw, List<String> options) {
        if (aiRaw == null) return "";
        String hint = aiRaw
                .strip()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (hint.length() > 180) hint = hint.substring(0, 180).trim();
        if (ANSWER_LEAK_PATTERN.matcher(hint).find()) return "";

        String lowerHint = hint.toLowerCase();
        for (String option : options) {
            String text = normalizeForMatch(option);
            if (text.length() >= 4 && lowerHint.contains(text)) {
                return "";
            }
        }
        return hint;
    }

    private String formatOptions(List<String> options) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < options.size(); i++) {
            char label = (char) ('A' + i);
            sb.append(label).append(") ").append(options.get(i)).append("\n");
        }
        return sb.toString().strip();
    }

    private String normalizeQuestionType(String questionType) {
        String value = safeText(questionType).toLowerCase();
        return "multi".equals(value) ? "multi" : "single";
    }

    private List<String> sanitizeOptions(List<String> options) {
        if (options == null) return List.of();
        return options.stream()
                .map(this::safeText)
                .filter(text -> !text.isBlank())
                .limit(6)
                .toList();
    }

    private String safeText(String value) {
        if (value == null) return "";
        return value.replaceAll("\\s+", " ").trim();
    }

    private String normalizeForMatch(String value) {
        return safeText(value).toLowerCase();
    }

    private String fallbackHint(String questionPrompt, List<String> options) {
        if (questionPrompt != null && questionPrompt.toLowerCase().contains("blank")) {
            return "Focus on the key term that best matches the sentence context and tone.";
        }
        if (options.size() >= 3) {
            return "Eliminate choices that are too absolute or off-topic, then pick the one closest to the core concept.";
        }
        return "Look for the option that best aligns with the main idea in the question.";
    }
}
