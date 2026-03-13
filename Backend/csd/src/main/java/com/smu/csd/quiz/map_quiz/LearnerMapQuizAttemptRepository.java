package com.smu.csd.quiz.map_quiz;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerMapQuizAttemptRepository extends JpaRepository<LearnerMapQuizAttempt, UUID> {
    List<LearnerMapQuizAttempt> findByLearner_LearnerIdAndQuiz_QuizIdOrderByAttemptedAtDesc(UUID learnerId, UUID quizId);
    Optional<LearnerMapQuizAttempt> findFirstByLearner_LearnerIdAndQuiz_QuizIdAndStatus(UUID learnerId, UUID quizId, LearnerMapQuizAttempt.Status status);
    boolean existsByLearner_LearnerIdAndQuiz_QuizIdAndStatus(UUID learnerId, UUID quizId, LearnerMapQuizAttempt.Status status);
}
