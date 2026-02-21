package com.smu.csd.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;

@Service
public class AIService {

    private final ChatClient chatClient;
    private final AIModerationResultRepository moderationRepository;
    private final ContentRepository contentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AIService(ChatClient.Builder chatClientBuilder,
                     AIModerationResultRepository moderationRepository,
                     ContentRepository contentRepository) {
        this.chatClient = chatClientBuilder.build();
        this.moderationRepository = moderationRepository;
        this.contentRepository = contentRepository;
    }

    /**
     * Takes a contributor's short description and generates full lesson body text.
     * The contributor still reviews and submits - AI just drafts it for them.
     */
    public String generateBody(String topicName, String title, String description) {
        return chatClient.prompt()
                .user("""
                        You are helping a contributor write educational content for a Gen Alpha culture learning platform.
                        Topic: %s
                        Title: %s
                        Description: %s

                        Write a clear, engaging lesson body (2-4 paragraphs) explaining this concept.
                        Use a friendly, approachable tone suitable for adults learning about Gen Alpha culture.
                        Include real examples where relevant. Return only the lesson text, no headings or JSON.
                        """.formatted(topicName, title, description))
                .call()
                .content();
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
        String rawResponse = chatClient.prompt()
                .user(buildPrompt(content))
                .call()
                .content();

        ModerationResponse parsed = parseResponse(rawResponse);

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
                You are moderating content for a Gen Alpha culture learning platform.
                Topic: %s
                Title: %s
                Content: %s

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

    // If AI response can't be parsed, default to NEEDS_REVIEW so a human can check it
    private ModerationResponse parseResponse(String json) {
        try {
            json = json.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode node = objectMapper.readTree(json);

            return new ModerationResponse(
                    node.get("quality_score").asInt(),
                    node.get("is_relevant").asBoolean(),
                    node.get("is_appropriate").asBoolean(),
                    AIModerationResult.Verdict.valueOf(node.get("ai_verdict").asText()),
                    node.get("reasoning").asText()
            );
        } catch (Exception e) {
            return new ModerationResponse(5, true, true,
                    AIModerationResult.Verdict.NEEDS_REVIEW,
                    "AI response parsing failed - flagged for manual review: " + e.getMessage());
        }
    }

    private record ModerationResponse(
            int qualityScore,
            boolean isRelevant,
            boolean isAppropriate,
            AIModerationResult.Verdict aiVerdict,
            String reasoning) {}
}