package com.smu.csd.quiz.map_quiz;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.dtos.LearnerDto;

@Service
public class MapQuizService {

    private static final int PASSING_SCORE_PERCENT = 70;

    private final MapQuizRepository quizRepository;
    private final MapQuizQuestionRepository questionRepository;
    private final MapQuizOptionRepository optionRepository;
    private final LearnerMapQuizAttemptRepository attemptRepository;
    private final RestTemplate restTemplate;

    @Value("${GAME_URL:http://game-service:8082}")
    private String gameServiceUrl;

    @Value("${PLAYER_SERVICE_URL:http://player-service:8084}")
    private String playerServiceUrl;

    public MapQuizService(
        MapQuizRepository quizRepository,
        MapQuizQuestionRepository questionRepository,
        MapQuizOptionRepository optionRepository,
        LearnerMapQuizAttemptRepository attemptRepository,
        RestTemplate restTemplate
    ) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.attemptRepository = attemptRepository;
        this.restTemplate = restTemplate;
    }

    private boolean checkMapExists(UUID mapId) {
        try {
            String url = gameServiceUrl + "/api/internal/maps/" + mapId;
            restTemplate.getForObject(url, java.util.Map.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkAllNpcsCompleted(UUID learnerId, UUID mapId) {
        try {
            String url = gameServiceUrl + "/api/internal/encounters/all-npcs-completed?learnerId=" + learnerId + "&mapId=" + mapId;
            Boolean result = restTemplate.getForObject(url, Boolean.class);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            return false;
        }
    }

    // --- Admin ---

    @Transactional
    public MapQuizResponse createQuiz(MapQuizCreateRequest request) {
        if (!checkMapExists(request.mapId())) {
            throw new IllegalArgumentException("Map not found: " + request.mapId());
        }

        if (quizRepository.findByMapId(request.mapId()).isPresent()) {
            throw new IllegalStateException("A quiz already exists for this map.");
        }

        MapQuiz quiz = MapQuiz.builder()
            .mapId(request.mapId())
            .title(request.title())
            .description(request.description())
            .isPublished(false)
            .build();

        return toResponse(quizRepository.save(quiz), true);
    }

    @Transactional
    public MapQuizResponse addQuestion(UUID quizId, MapQuizQuestionRequest request) {
        MapQuiz quiz = requireQuiz(quizId);

        MapQuizQuestion question = MapQuizQuestion.builder()
            .quiz(quiz)
            .scenarioText(request.scenarioText())
            .questionOrder(request.questionOrder())
            .isMultiSelect(request.isMultiSelect())
            .build();
        questionRepository.save(question);

        for (MapQuizOptionRequest opt : request.options()) {
            optionRepository.save(MapQuizOption.builder()
                .question(question)
                .optionText(opt.optionText())
                .isCorrect(opt.isCorrect())
                .build());
        }

        return toResponse(quiz, true);
    }

    @Transactional
    public MapQuizResponse unpublishQuiz(UUID quizId) {
        MapQuiz quiz = requireQuiz(quizId);
        if (!quiz.isPublished()) {
            throw new IllegalStateException("Quiz is not published.");
        }
        quiz.setPublished(false);
        return toResponse(quizRepository.save(quiz), true);
    }

    @Transactional
    public MapQuizResponse removeQuestion(UUID quizId, UUID questionId) {
        MapQuiz quiz = requireQuiz(quizId);
        if (quiz.isPublished()) {
            throw new IllegalStateException("Cannot remove questions from a published quiz. Unpublish it first.");
        }
        MapQuizQuestion question = questionRepository.findById(questionId)
            .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        if (!question.getQuiz().getQuizId().equals(quizId)) {
            throw new IllegalArgumentException("Question does not belong to this quiz.");
        }
        optionRepository.deleteByQuestion_QuestionId(questionId);
        questionRepository.deleteById(questionId);
        return toResponse(quiz, true);
    }

    @Transactional
    public MapQuizResponse publishQuiz(UUID quizId) {
        MapQuiz quiz = requireQuiz(quizId);
        List<MapQuizQuestion> questions = questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId);
        if (questions.isEmpty()) {
            throw new IllegalStateException("Cannot publish a quiz with no questions.");
        }
        quiz.setPublished(true);
        return toResponse(quizRepository.save(quiz), true);
    }

    public MapQuizResponse getQuizForAdmin(UUID mapId) {
        MapQuiz quiz = quizRepository.findByMapId(mapId)
            .orElseThrow(() -> new IllegalArgumentException("No quiz found for map: " + mapId));
        return toResponse(quiz, true);
    }

    // --- Learner ---

    public MapQuizResponse getQuizForLearner(UUID supabaseUserId, UUID mapId) {
        LearnerDto learner = requireLearner(supabaseUserId);
        if (!checkAllNpcsCompleted(learner.learnerId(), mapId)) {
            throw new IllegalStateException("You must interact with all NPCs before accessing the quiz.");
        }
        MapQuiz quiz = quizRepository.findByMapIdAndIsPublishedTrue(mapId)
            .orElseThrow(() -> new IllegalArgumentException("No published quiz found for map: " + mapId));
        return toResponse(quiz, false);
    }

    @Transactional
    public MapQuizSubmitResponse submitAttempt(UUID supabaseUserId, MapQuizSubmitRequest request) {
        LearnerDto learner = requireLearner(supabaseUserId);
        MapQuiz quiz = requireQuiz(request.quizId());
        List<MapQuizAnswerRequest> answers = request.answers() == null ? List.of() : request.answers();
        Set<UUID> submittedQuestionIds = answers.stream()
            .map(MapQuizAnswerRequest::questionId)
            .filter(id -> id != null)
            .collect(Collectors.toSet());
        Set<UUID> quizQuestionIds = new HashSet<>(
            java.util.Optional.ofNullable(questionRepository.findQuestionIdsByQuizId(quiz.getQuizId())).orElse(List.of())
        );
        Map<UUID, Set<UUID>> correctOptionIdsByQuestionId = loadCorrectOptionIdsByQuestionIds(submittedQuestionIds);

        // Score only against the questions that were actually submitted (frontend may
        // send a subset of the full quiz due to per-monster question splitting).
        int total = answers.size();
        int correct = 0;

        for (MapQuizAnswerRequest answer : answers) {
            if (isAnswerCorrect(
                    answer.questionId(),
                    answer.selectedOptionIds(),
                    quizQuestionIds,
                    correctOptionIdsByQuestionId)) {
                correct++;
            }
        }

        boolean passed = total > 0 && (correct * 100 / total) >= PASSING_SCORE_PERCENT;

        LearnerMapQuizAttempt attempt = LearnerMapQuizAttempt.builder()
            .learnerId(learner.learnerId())
            .quiz(quiz)
            .score(correct)
            .status(passed ? LearnerMapQuizAttempt.Status.PASSED : LearnerMapQuizAttempt.Status.FAILED)
            .completedAt(LocalDateTime.now())
            .build();

        attempt = attemptRepository.save(attempt);
        return new MapQuizSubmitResponse(attempt.getAttemptId(), passed, correct, total);
    }

    public MapQuizEvaluateResponse evaluateAnswer(UUID supabaseUserId, MapQuizEvaluateRequest request) {
        if (supabaseUserId == null) {
            throw new IllegalArgumentException("Supabase user id is required.");
        }
        if (request == null || request.quizId() == null || request.questionId() == null) {
            throw new IllegalArgumentException("quizId and questionId are required.");
        }
        MapQuiz quiz = requireQuiz(request.quizId());
        Set<UUID> quizQuestionIds = new HashSet<>(
            java.util.Optional.ofNullable(questionRepository.findQuestionIdsByQuizId(quiz.getQuizId())).orElse(List.of())
        );
        Map<UUID, Set<UUID>> correctOptionIdsByQuestionId = loadCorrectOptionIdsByQuestionIds(List.of(request.questionId()));
        boolean correct = isAnswerCorrect(
                request.questionId(),
                request.selectedOptionIds(),
                quizQuestionIds,
                correctOptionIdsByQuestionId);
        return new MapQuizEvaluateResponse(correct);
    }

    public List<LearnerMapQuizAttemptResponse> getMyAttempts(UUID supabaseUserId, UUID quizId) {
        LearnerDto learner = requireLearner(supabaseUserId);
        MapQuiz quiz = requireQuiz(quizId);
        int totalQuestions = questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId).size();
        return attemptRepository
            .findByLearnerIdAndQuiz_QuizIdOrderByAttemptedAtDesc(learner.learnerId(), quizId)
            .stream()
            .map(a -> new LearnerMapQuizAttemptResponse(
                a.getAttemptId(),
                a.getStatus().name(),
                a.getScore(),
                totalQuestions,
                a.getAttemptedAt(),
                a.getCompletedAt()
            ))
            .toList();
    }

    public boolean hasPassedQuiz(UUID supabaseUserId, UUID mapId) {
        LearnerDto learner = fetchLearner(supabaseUserId);
        if (learner == null) return false;
        return quizRepository.findByMapIdAndIsPublishedTrue(mapId)
            .map(quiz -> attemptRepository.existsByLearnerIdAndQuiz_QuizIdAndStatus(
                learner.learnerId(), quiz.getQuizId(), LearnerMapQuizAttempt.Status.PASSED))
            .orElse(true); // no quiz published = no gate
    }

    public boolean hasPassedPublishedQuizForLearner(UUID learnerId, UUID mapId) {
        if (learnerId == null || mapId == null) return false;
        return quizRepository.findByMapIdAndIsPublishedTrue(mapId)
            .map(quiz -> attemptRepository.existsByLearnerIdAndQuiz_QuizIdAndStatus(
                learnerId, quiz.getQuizId(), LearnerMapQuizAttempt.Status.PASSED))
            .orElse(false);
    }

    private LearnerDto fetchLearner(UUID supabaseUserId) {
        try {
            String url = playerServiceUrl + "/api/internal/learners/supabase/" + supabaseUserId;
            return restTemplate.getForObject(url, LearnerDto.class);
        } catch (Exception e) {
            return null;
        }
    }

    // --- Helpers ---

    private MapQuiz requireQuiz(UUID quizId) {
        return quizRepository.findById(quizId)
            .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));
    }

    private LearnerDto requireLearner(UUID supabaseUserId) {
        LearnerDto learner = fetchLearner(supabaseUserId);
        if (learner == null) throw new IllegalArgumentException("Learner not found.");
        return learner;
    }

    private boolean isAnswerCorrect(
            UUID questionId,
            List<UUID> selectedOptionIds,
            Set<UUID> quizQuestionIds,
            Map<UUID, Set<UUID>> correctOptionIdsByQuestionId
    ) {
        if (questionId == null) {
            return false;
        }
        if (!quizQuestionIds.contains(questionId)) {
            throw new IllegalArgumentException("Question does not belong to this quiz.");
        }

        Set<UUID> correctIds = correctOptionIdsByQuestionId.getOrDefault(questionId, Collections.emptySet());
        Set<UUID> selectedIds = selectedOptionIds == null
            ? Set.of()
            : selectedOptionIds.stream().filter(id -> id != null).collect(Collectors.toCollection(HashSet::new));
        return correctIds.equals(selectedIds);
    }

    private MapQuizResponse toResponse(MapQuiz quiz, boolean includeAnswers) {
        List<MapQuizQuestion> questions = questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quiz.getQuizId());
        List<UUID> questionIds = questions.stream()
            .map(MapQuizQuestion::getQuestionId)
            .toList();
        Map<UUID, List<MapQuizOption>> optionsByQuestionId = loadOptionsByQuestionIds(questionIds);

        List<MapQuizQuestionResponse> questionResponses = questions.stream()
            .map(q -> {
                List<MapQuizOption> options = optionsByQuestionId.getOrDefault(q.getQuestionId(), List.of());
                List<MapQuizOptionResponse> optionResponses = options.stream()
                    .map(o -> new MapQuizOptionResponse(
                        o.getOptionId(),
                        o.getOptionText(),
                        includeAnswers ? o.isCorrect() : null
                    ))
                    .toList();
                return new MapQuizQuestionResponse(q.getQuestionId(), q.getScenarioText(), q.getQuestionOrder(), q.isMultiSelect(), optionResponses);
            })
            .toList();

        return new MapQuizResponse(
            quiz.getQuizId(),
            quiz.getMapId(),
            quiz.getTitle(),
            quiz.getDescription(),
            quiz.isPublished(),
            questionResponses
        );
    }

    private Map<UUID, List<MapQuizOption>> loadOptionsByQuestionIds(Collection<UUID> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return Map.of();
        }
        List<MapQuizOption> options = java.util.Optional.ofNullable(optionRepository.findByQuestion_QuestionIdIn(questionIds))
            .orElse(List.of());
        boolean hasUnmappedOption = options.stream()
            .anyMatch(o -> o == null || o.getQuestion() == null || o.getQuestion().getQuestionId() == null);
        if (hasUnmappedOption) {
            Map<UUID, List<MapQuizOption>> byQuestion = new HashMap<>();
            for (UUID questionId : questionIds) {
                if (questionId == null) {
                    continue;
                }
                List<MapQuizOption> perQuestion = java.util.Optional
                    .ofNullable(optionRepository.findByQuestion_QuestionId(questionId))
                    .orElse(List.of());
                byQuestion.put(questionId, perQuestion);
            }
            return byQuestion;
        }
        return options.stream()
            .collect(Collectors.groupingBy(o -> o.getQuestion().getQuestionId()));
    }

    private Map<UUID, Set<UUID>> loadCorrectOptionIdsByQuestionIds(Collection<UUID> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Set<UUID>> byQuestion = new HashMap<>();
        loadOptionsByQuestionIds(questionIds).forEach((questionId, options) -> {
            Set<UUID> correctIds = options.stream()
                .filter(MapQuizOption::isCorrect)
                .map(MapQuizOption::getOptionId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(HashSet::new));
            byQuestion.put(questionId, correctIds);
        });
        return byQuestion;
    }
}
