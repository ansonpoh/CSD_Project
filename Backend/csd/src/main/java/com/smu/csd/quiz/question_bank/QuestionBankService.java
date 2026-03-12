package com.smu.csd.quiz.question_bank;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.contents.Content;
import com.smu.csd.maps.Map;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapRepository;
import com.smu.csd.quiz.map_quiz.MapQuiz;
import com.smu.csd.quiz.map_quiz.MapQuizOption;
import com.smu.csd.quiz.map_quiz.MapQuizOptionRepository;
import com.smu.csd.quiz.map_quiz.MapQuizQuestion;
import com.smu.csd.quiz.map_quiz.MapQuizQuestionRepository;
import com.smu.csd.quiz.map_quiz.MapQuizRepository;

@Service
public class QuestionBankService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final BankQuestionRepository bankQuestionRepository;
    private final BankQuestionOptionRepository bankOptionRepository;
    private final MapRepository mapRepository;
    private final NPCMapRepository npcMapRepository;
    private final MapQuizRepository mapQuizRepository;
    private final MapQuizQuestionRepository mapQuizQuestionRepository;
    private final MapQuizOptionRepository mapQuizOptionRepository;
    private final ChatClient chatClient;

    public QuestionBankService(
        BankQuestionRepository bankQuestionRepository,
        BankQuestionOptionRepository bankOptionRepository,
        MapRepository mapRepository,
        NPCMapRepository npcMapRepository,
        MapQuizRepository mapQuizRepository,
        MapQuizQuestionRepository mapQuizQuestionRepository,
        MapQuizOptionRepository mapQuizOptionRepository,
        ChatClient.Builder chatClientBuilder
    ) {
        this.bankQuestionRepository = bankQuestionRepository;
        this.bankOptionRepository = bankOptionRepository;
        this.mapRepository = mapRepository;
        this.npcMapRepository = npcMapRepository;
        this.mapQuizRepository = mapQuizRepository;
        this.mapQuizQuestionRepository = mapQuizQuestionRepository;
        this.mapQuizOptionRepository = mapQuizOptionRepository;
        this.chatClient = chatClientBuilder.build();
    }

    // --- Content summary ---

    public List<MapContentSummaryResponse> getContentSummary(UUID mapId) {
        return npcMapRepository.findAllByMapMapIdAndContentStatus(mapId, Content.Status.APPROVED)
            .stream()
            .filter(nm -> nm.getNpc() != null && nm.getContent() != null)
            .map(nm -> new MapContentSummaryResponse(
                nm.getNpc().getName(),
                nm.getContent().getTitle(),
                nm.getContent().getBody()
            ))
            .toList();
    }

    // --- AI generation (returns draft, does not save) ---

    public List<BankQuestionRequest> generateDraft(UUID mapId) {
        List<MapContentSummaryResponse> summary = getContentSummary(mapId);
        if (summary.isEmpty()) {
            throw new IllegalStateException("No approved content found for this map to generate questions from.");
        }

        StringBuilder contentBlock = new StringBuilder();
        for (MapContentSummaryResponse item : summary) {
            contentBlock.append("NPC: ").append(item.npcName()).append("\n");
            contentBlock.append("Lesson: ").append(item.contentTitle()).append("\n");
            contentBlock.append(item.contentBody()).append("\n\n");
        }

        String prompt = """
                You are a quiz designer for a Gen-Alpha educational game platform. \
                Based on the following lesson content, generate exactly 10 scenario-based multiple-choice questions.

                Tone and style rules:
                - Write scenarios that feel real and relatable to Generation Alpha teenagers and young adults.
                - Use variety across question types: some as short dialogues between friends or characters, \
                some as social media posts or group chat snippets, some as first-person narrations \
                ("You are...", "Your friend asks..."), and some as story-based mini-situations.
                - Language can be casual and modern, but must remain clear and appropriate.
                - Do NOT use formal academic language. Make it feel like a real-life moment, not a textbook.
                - Do not reveal which options are correct in the scenario text.
                - Questions must test understanding of the lesson content only.

                Answer option rules:
                - Each question must have exactly 4 to 5 answer options.
                - At least 1 and at most 3 options should be correct (isCorrect: true). The rest are wrong (isCorrect: false).

                Lesson content:
                %s

                Return ONLY a valid JSON array with no other text, in this exact format:
                [
                  {
                    "scenarioText": "...",
                    "options": [
                      {"optionText": "...", "isCorrect": true},
                      {"optionText": "...", "isCorrect": false}
                    ]
                  }
                ]
                """.formatted(contentBlock.toString().replace("%", "%%"));

        String raw = chatClient.prompt()
            .user(prompt)
            .call()
            .content();

        if (raw == null || raw.isBlank()) {
            throw new IllegalStateException("AI returned an empty response. Please try again.");
        }

        String cleaned = raw.strip()
            .replaceAll("(?s)^```[a-z]*\\s*", "")
            .replaceAll("(?s)\\s*```$", "")
            .replaceAll(",\\s*(]|})", "$1")
            .strip();

        try {
            return OBJECT_MAPPER.readValue(cleaned, new TypeReference<List<BankQuestionRequest>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse AI-generated questions: " + e.getMessage());
        }
    }

    // --- Save admin-finalized questions to bank ---

    @Transactional
    public List<BankQuestionResponse> saveQuestions(UUID mapId, List<BankQuestionRequest> requests) {
        Map map = mapRepository.findById(mapId)
            .orElseThrow(() -> new IllegalArgumentException("Map not found: " + mapId));

        return requests.stream().map(req -> {
            BankQuestion question = BankQuestion.builder()
                .map(map)
                .scenarioText(req.scenarioText())
                .status(BankQuestion.Status.PENDING_REVIEW)
                .build();
            bankQuestionRepository.save(question);

            List<BankQuestionOption> options = req.options().stream()
                .map(opt -> BankQuestionOption.builder()
                    .bankQuestion(question)
                    .optionText(opt.optionText())
                    .isCorrect(opt.isCorrect())
                    .build())
                .toList();
            bankOptionRepository.saveAll(options);

            return toResponse(question, options);
        }).toList();
    }

    // --- Read ---

    public List<BankQuestionResponse> getAllBankQuestions() {
        return bankQuestionRepository.findAll().stream()
            .map(this::toResponseWithOptions)
            .toList();
    }

    public List<BankQuestionResponse> getBankQuestionsByMap(UUID mapId) {
        return bankQuestionRepository.findByMap_MapId(mapId).stream()
            .map(this::toResponseWithOptions)
            .toList();
    }

    // --- Edit ---

    @Transactional
    public BankQuestionResponse updateQuestion(UUID bankQuestionId, BankQuestionRequest request) {
        BankQuestion question = requireBankQuestion(bankQuestionId);
        question.setScenarioText(request.scenarioText());
        bankQuestionRepository.save(question);

        bankOptionRepository.deleteByBankQuestion_BankQuestionId(bankQuestionId);

        List<BankQuestionOption> options = request.options().stream()
            .map(opt -> BankQuestionOption.builder()
                .bankQuestion(question)
                .optionText(opt.optionText())
                .isCorrect(opt.isCorrect())
                .build())
            .toList();
        bankOptionRepository.saveAll(options);

        return toResponse(question, options);
    }

    // --- Approve / Reject ---

    @Transactional
    public BankQuestionResponse approveQuestion(UUID bankQuestionId) {
        BankQuestion question = requireBankQuestion(bankQuestionId);
        if (question.getStatus() != BankQuestion.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW questions can be approved.");
        }
        question.setStatus(BankQuestion.Status.APPROVED);
        return toResponseWithOptions(bankQuestionRepository.save(question));
    }

    @Transactional
    public BankQuestionResponse rejectQuestion(UUID bankQuestionId) {
        BankQuestion question = requireBankQuestion(bankQuestionId);
        if (question.getStatus() != BankQuestion.Status.PENDING_REVIEW) {
            throw new IllegalStateException("Only PENDING_REVIEW questions can be rejected.");
        }
        question.setStatus(BankQuestion.Status.REJECTED);
        return toResponseWithOptions(bankQuestionRepository.save(question));
    }

    // --- Copy approved bank question into a quiz ---

    @Transactional
    public void addBankQuestionToQuiz(UUID quizId, UUID bankQuestionId) {
        BankQuestion bankQuestion = requireBankQuestion(bankQuestionId);
        if (bankQuestion.getStatus() != BankQuestion.Status.APPROVED) {
            throw new IllegalStateException("Only APPROVED bank questions can be added to a quiz.");
        }

        MapQuiz quiz = mapQuizRepository.findById(quizId)
            .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));

        int nextOrder = mapQuizQuestionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId).size();

        MapQuizQuestion quizQuestion = MapQuizQuestion.builder()
            .quiz(quiz)
            .scenarioText(bankQuestion.getScenarioText())
            .questionOrder(nextOrder)
            .build();
        mapQuizQuestionRepository.save(quizQuestion);

        bankOptionRepository.findByBankQuestion_BankQuestionId(bankQuestionId).forEach(opt ->
            mapQuizOptionRepository.save(MapQuizOption.builder()
                .question(quizQuestion)
                .optionText(opt.getOptionText())
                .isCorrect(opt.isCorrect())
                .build())
        );
    }

    // --- Helpers ---

    private BankQuestion requireBankQuestion(UUID bankQuestionId) {
        return bankQuestionRepository.findById(bankQuestionId)
            .orElseThrow(() -> new IllegalArgumentException("Bank question not found: " + bankQuestionId));
    }

    private BankQuestionResponse toResponseWithOptions(BankQuestion question) {
        List<BankQuestionOption> options = bankOptionRepository
            .findByBankQuestion_BankQuestionId(question.getBankQuestionId());
        return toResponse(question, options);
    }

    private BankQuestionResponse toResponse(BankQuestion question, List<BankQuestionOption> options) {
        List<BankQuestionOptionResponse> optionResponses = options.stream()
            .map(o -> new BankQuestionOptionResponse(o.getBankOptionId(), o.getOptionText(), o.isCorrect()))
            .toList();
        return new BankQuestionResponse(
            question.getBankQuestionId(),
            question.getMap().getMapId(),
            question.getMap().getName(),
            question.getScenarioText(),
            question.getStatus().name(),
            question.getCreatedAt(),
            optionResponses
        );
    }
}
