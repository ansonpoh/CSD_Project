package com.smu.csd;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.ai.AIModerationResult;
import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentService;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.leaderboard.LeaderboardService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class ContentFlowTest {

    @MockitoBean
    JwtDecoder jwtDecoder; // prevents Security from trying to reach Supabase on startup

    @MockitoBean
    LeaderboardService leaderboardService; // prevents Redis connection on startup

    @Autowired
    private ContentService contentService;

    // ─── FILL THESE IN BEFORE RUNNING ────────────────────────────
    private static final UUID CONTRIBUTOR_ID = UUID.fromString("6b92ce81-0800-47c3-816f-415dde1f8e57");
    private static final UUID TOPIC_ID       = UUID.fromString("0b2c4978-5bec-4bae-8a3a-4bf5fa92b291");
    private static final String TITLE        = "What is Rizz?";
    private static final String DESCRIPTION  = """
            Rizz means natural charm — the ability to attract others effortlessly.
            It was coined by Twitch streamer Kai Cenat around 2021-2022.
            It went viral after actor Tom Holland used it in a 2023 interview.
            It works as a noun ("he has rizz") or a verb ("he rizzed her up").
            Unspoken rizz means attracting someone without even saying a word.
            W rizz means someone has exceptional, top-tier charm.
            It was named Oxford Word of the Year in 2023.
            Teens and young adults use it constantly online, in memes, and in everyday conversation.
            """;
    // ─────────────────────────────────────────────────────────────

    /**
     * STEP 1: Submit content and see AI generate dialogue + screen it.
     * Run this first. Copy the Content ID printed at the end if status is NEEDS_REVIEW.
     */
    @Test
    void step1_submitContent() throws Exception {
        System.out.println("\n============================================");
        System.out.println("  STEP 1: SUBMIT CONTENT");
        System.out.println("============================================");
        System.out.println("  Title      : " + TITLE);
        System.out.println("  Description: " + DESCRIPTION);
        System.out.println("  Waiting for AI... (may take a few seconds)\n");

        Content content = contentService.submitContent(CONTRIBUTOR_ID, TOPIC_ID, TITLE, DESCRIPTION);

        // Print AI-generated dialogue
        System.out.println("--------------------------------------------");
        System.out.println("  AI-GENERATED DIALOGUE");
        System.out.println("--------------------------------------------");
        printDialogue(content.getBody());

        // Print moderation result
        AIModerationResult mod = contentService.getModerationResult(content.getContentId());
        System.out.println("\n--------------------------------------------");
        System.out.println("  AI SCREENING RESULT");
        System.out.println("--------------------------------------------");
        System.out.println("  Verdict      : " + mod.getAiVerdict());
        System.out.println("  Quality Score: " + mod.getQualityScore() + " / 10");
        System.out.println("  Relevant     : " + mod.isRelevant());
        System.out.println("  Appropriate  : " + mod.isAppropriate());
        System.out.println("  Reasoning    : " + mod.getReasoning());

        // Print outcome
        System.out.println("\n--------------------------------------------");
        System.out.println("  OUTCOME  →  Content status: " + content.getStatus());
        System.out.println("--------------------------------------------");
        switch (content.getStatus()) {
            case APPROVED ->
                System.out.println("  AUTO-APPROVED: Content is live in the game.");
            case REJECTED ->
                System.out.println("  AUTO-REJECTED: Did not pass quality check.");
            case PENDING_REVIEW -> {
                System.out.println("  NEEDS REVIEW: Admin must manually decide.");
                System.out.println("  --> Copy this Content ID for step 2 or 3:");
                System.out.println("      " + content.getContentId());
            }
        }
        System.out.println("============================================\n");
    }

    /**
     * STEP 2 (only if step 1 gave NEEDS_REVIEW): Admin manually approves.
     * Paste the Content ID from step 1 below.
     */
    @Test
    void step2_manualApprove() throws ResourceNotFoundException {
        UUID contentId = UUID.fromString("paste-content-id-from-step-1");

        System.out.println("\n============================================");
        System.out.println("  STEP 2: MANUAL APPROVE");
        System.out.println("============================================");
        Content approved = contentService.approveContent(contentId);
        System.out.println("  New status: " + approved.getStatus());
        System.out.println("  Content is now live in the game.");
        System.out.println("============================================\n");
    }

    /**
     * STEP 3 (only if step 1 gave NEEDS_REVIEW): Admin manually rejects.
     * Paste the Content ID from step 1 below.
     */
    @Test
    void step3_manualReject() throws ResourceNotFoundException {
        UUID contentId = UUID.fromString("paste-content-id-from-step-1");

        System.out.println("\n============================================");
        System.out.println("  STEP 3: MANUAL REJECT");
        System.out.println("============================================");
        Content rejected = contentService.rejectContent(contentId);
        System.out.println("  New status: " + rejected.getStatus());
        System.out.println("  Content has been rejected.");
        System.out.println("============================================\n");
    }

    // Parses the JSON body and prints each NPC line neatly
    private void printDialogue(String body) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<String> lines = mapper.readValue(body, new TypeReference<>() {});
            for (int i = 0; i < lines.size(); i++) {
                System.out.printf("  [%2d] %s%n", i + 1, lines.get(i));
            }
        } catch (Exception e) {
            System.out.println("  (Could not parse as JSON, raw body below)");
            System.out.println(body);
        }
    }
}