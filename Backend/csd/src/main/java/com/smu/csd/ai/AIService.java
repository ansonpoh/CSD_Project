package com.smu.csd.ai;

import java.util.UUID;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.exception.ResourceNotFoundException;

@Service
public class AIService {

    private final ChatClient chatClient;
    private final AIModerationResultRepository moderationRepository;
    private final ContentRepository contentRepository;

    public AIService(ChatClient.Builder chatClientBuilder,
                     AIModerationResultRepository moderationRepository,
                     ContentRepository contentRepository) {
        this.chatClient = chatClientBuilder.build();
        this.moderationRepository = moderationRepository;
        this.contentRepository = contentRepository;
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

    private record ModerationResponse(
            @JsonProperty("quality_score") int qualityScore,
            @JsonProperty("is_relevant") boolean isRelevant,
            @JsonProperty("is_appropriate") boolean isAppropriate,
            @JsonProperty("ai_verdict") AIModerationResult.Verdict aiVerdict,
            @JsonProperty("reasoning") String reasoning) {}

    
}