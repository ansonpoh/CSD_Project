package com.smu.csd.quiz.map_quiz;

import java.time.LocalDateTime;
import java.util.List;
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

        // Score only against the questions that were actually submitted (frontend may
        // send a subset of the full quiz due to per-monster question splitting).
        int total = request.answers().size();
        int correct = 0;

        for (MapQuizAnswerRequest answer : request.answers()) {
            List<MapQuizOption> options = optionRepository.findByQuestion_QuestionId(answer.questionId());
            Set<UUID> correctIds = options.stream()
                .filter(MapQuizOption::isCorrect)
                .map(MapQuizOption::getOptionId)
                .collect(Collectors.toSet());
            Set<UUID> selectedIds = answer.selectedOptionIds() == null
                ? Set.of()
                : Set.copyOf(answer.selectedOptionIds());

            if (correctIds.equals(selectedIds)) correct++;
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

    private MapQuizResponse toResponse(MapQuiz quiz, boolean includeAnswers) {
        List<MapQuizQuestion> questions = questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quiz.getQuizId());
        List<MapQuizQuestionResponse> questionResponses = questions.stream()
            .map(q -> {
                List<MapQuizOption> options = optionRepository.findByQuestion_QuestionId(q.getQuestionId());
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
}
