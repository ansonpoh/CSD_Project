package com.smu.csd.quiz.map_quiz;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smu.csd.encounters.EncounterService;
import com.smu.csd.maps.Map;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.roles.learner.Learner;
import com.smu.csd.roles.learner.LearnerRepository;

@Service
public class MapQuizService {

    private static final int PASSING_SCORE_PERCENT = 70;

    private final MapQuizRepository quizRepository;
    private final MapQuizQuestionRepository questionRepository;
    private final MapQuizOptionRepository optionRepository;
    private final LearnerMapQuizAttemptRepository attemptRepository;
    private final MapRepository mapRepository;
    private final LearnerRepository learnerRepository;
    private final EncounterService encounterService;

    public MapQuizService(
        MapQuizRepository quizRepository,
        MapQuizQuestionRepository questionRepository,
        MapQuizOptionRepository optionRepository,
        LearnerMapQuizAttemptRepository attemptRepository,
        MapRepository mapRepository,
        LearnerRepository learnerRepository,
        EncounterService encounterService
    ) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.attemptRepository = attemptRepository;
        this.mapRepository = mapRepository;
        this.learnerRepository = learnerRepository;
        this.encounterService = encounterService;
    }

    // --- Admin ---

    @Transactional
    public MapQuizResponse createQuiz(MapQuizCreateRequest request) {
        Map map = mapRepository.findById(request.mapId())
            .orElseThrow(() -> new IllegalArgumentException("Map not found: " + request.mapId()));

        if (quizRepository.findByMap_MapId(request.mapId()).isPresent()) {
            throw new IllegalStateException("A quiz already exists for this map.");
        }

        MapQuiz quiz = MapQuiz.builder()
            .map(map)
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
        MapQuiz quiz = quizRepository.findByMap_MapId(mapId)
            .orElseThrow(() -> new IllegalArgumentException("No quiz found for map: " + mapId));
        return toResponse(quiz, true);
    }

    // --- Learner ---

    public MapQuizResponse getQuizForLearner(UUID supabaseUserId, UUID mapId) {
        Learner learner = requireLearner(supabaseUserId);
        if (!encounterService.hasAllNpcsCompletedOnMap(learner.getLearnerId(), mapId)) {
            throw new IllegalStateException("You must interact with all NPCs before accessing the quiz.");
        }
        MapQuiz quiz = quizRepository.findByMap_MapIdAndIsPublishedTrue(mapId)
            .orElseThrow(() -> new IllegalArgumentException("No published quiz found for map: " + mapId));
        return toResponse(quiz, false);
    }

    @Transactional
    public MapQuizSubmitResponse submitAttempt(UUID supabaseUserId, MapQuizSubmitRequest request) {
        Learner learner = requireLearner(supabaseUserId);
        MapQuiz quiz = requireQuiz(request.quizId());
        if (!encounterService.hasAllNpcsCompletedOnMap(learner.getLearnerId(), quiz.getMap().getMapId())) {
            throw new IllegalStateException("You must interact with all NPCs before submitting the quiz.");
        }

        List<MapQuizQuestion> questions = questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quiz.getQuizId());
        int total = questions.size();
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
            .learner(learner)
            .quiz(quiz)
            .score(correct)
            .status(passed ? LearnerMapQuizAttempt.Status.PASSED : LearnerMapQuizAttempt.Status.FAILED)
            .completedAt(LocalDateTime.now())
            .build();

        attempt = attemptRepository.save(attempt);
        return new MapQuizSubmitResponse(attempt.getAttemptId(), passed, correct, total);
    }

    public List<LearnerMapQuizAttemptResponse> getMyAttempts(UUID supabaseUserId, UUID quizId) {
        Learner learner = requireLearner(supabaseUserId);
        MapQuiz quiz = requireQuiz(quizId);
        int totalQuestions = questionRepository.findByQuiz_QuizIdOrderByQuestionOrder(quizId).size();
        return attemptRepository
            .findByLearner_LearnerIdAndQuiz_QuizIdOrderByAttemptedAtDesc(learner.getLearnerId(), quizId)
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
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
        if (learner == null) return false;
        return quizRepository.findByMap_MapIdAndIsPublishedTrue(mapId)
            .map(quiz -> attemptRepository.existsByLearner_LearnerIdAndQuiz_QuizIdAndStatus(
                learner.getLearnerId(), quiz.getQuizId(), LearnerMapQuizAttempt.Status.PASSED))
            .orElse(true); // no quiz published = no gate
    }

    // --- Helpers ---

    private MapQuiz requireQuiz(UUID quizId) {
        return quizRepository.findById(quizId)
            .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));
    }

    private Learner requireLearner(UUID supabaseUserId) {
        Learner learner = learnerRepository.findBySupabaseUserId(supabaseUserId);
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
                return new MapQuizQuestionResponse(q.getQuestionId(), q.getScenarioText(), q.getQuestionOrder(), optionResponses);
            })
            .toList();

        return new MapQuizResponse(
            quiz.getQuizId(),
            quiz.getMap().getMapId(),
            quiz.getTitle(),
            quiz.getDescription(),
            quiz.isPublished(),
            questionResponses
        );
    }
}
