package com.smu.csd.quiz.map_quiz;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/map-quizzes")
public class MapQuizController {

    private final MapQuizService mapQuizService;

    public MapQuizController(MapQuizService mapQuizService) {
        this.mapQuizService = mapQuizService;
    }

    // --- Admin endpoints ---

    @PostMapping
    public MapQuizResponse createQuiz(@RequestBody MapQuizCreateRequest request) {
        return mapQuizService.createQuiz(request);
    }

    @PostMapping("/{quizId}/questions")
    public MapQuizResponse addQuestion(
        @PathVariable UUID quizId,
        @RequestBody MapQuizQuestionRequest request
    ) {
        return mapQuizService.addQuestion(quizId, request);
    }

    @PutMapping("/{quizId}/publish")
    public MapQuizResponse publishQuiz(@PathVariable UUID quizId) {
        return mapQuizService.publishQuiz(quizId);
    }

    @PutMapping("/{quizId}/unpublish")
    public MapQuizResponse unpublishQuiz(@PathVariable UUID quizId) {
        return mapQuizService.unpublishQuiz(quizId);
    }

    @DeleteMapping("/{quizId}/questions/{questionId}")
    public MapQuizResponse removeQuestion(
        @PathVariable UUID quizId,
        @PathVariable UUID questionId
    ) {
        return mapQuizService.removeQuestion(quizId, questionId);
    }

    @GetMapping("/map/{mapId}/admin")
    public MapQuizResponse getQuizForAdmin(@PathVariable UUID mapId) {
        return mapQuizService.getQuizForAdmin(mapId);
    }

    // --- Learner endpoints ---

    @GetMapping("/map/{mapId}")
    public MapQuizResponse getQuizForLearner(@PathVariable UUID mapId, Authentication authentication) {
        return mapQuizService.getQuizForLearner(getSupabaseUserId(authentication), mapId);
    }

    @PostMapping("/submit")
    public MapQuizSubmitResponse submitAttempt(
        @RequestBody MapQuizSubmitRequest request,
        Authentication authentication
    ) {
        return mapQuizService.submitAttempt(getSupabaseUserId(authentication), request);
    }

    @PostMapping("/evaluate")
    public MapQuizEvaluateResponse evaluateAnswer(
        @RequestBody MapQuizEvaluateRequest request,
        Authentication authentication
    ) {
        return mapQuizService.evaluateAnswer(getSupabaseUserId(authentication), request);
    }

    @GetMapping("/map/{mapId}/my-status")
    public boolean getMyStatus(@PathVariable UUID mapId, Authentication authentication) {
        return mapQuizService.hasPassedQuiz(getSupabaseUserId(authentication), mapId);
    }

    @GetMapping("/{quizId}/my-attempts")
    public List<LearnerMapQuizAttemptResponse> getMyAttempts(
        @PathVariable UUID quizId,
        Authentication authentication
    ) {
        return mapQuizService.getMyAttempts(getSupabaseUserId(authentication), quizId);
    }

    // --- Helper ---

    private UUID getSupabaseUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }
}
