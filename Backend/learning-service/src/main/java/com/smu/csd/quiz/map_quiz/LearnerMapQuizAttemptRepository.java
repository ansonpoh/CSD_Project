package com.smu.csd.quiz.map_quiz;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearnerMapQuizAttemptRepository extends JpaRepository<LearnerMapQuizAttempt, UUID> {
    List<LearnerMapQuizAttempt> findByLearnerIdAndQuiz_QuizIdOrderByAttemptedAtDesc(UUID learnerId, UUID quizId);
    Optional<LearnerMapQuizAttempt> findFirstByLearnerIdAndQuiz_QuizIdAndStatus(UUID learnerId, UUID quizId, LearnerMapQuizAttempt.Status status);
    boolean existsByLearnerIdAndQuiz_QuizIdAndStatus(UUID learnerId, UUID quizId, LearnerMapQuizAttempt.Status status);
    @Query("SELECT COUNT(a), AVG(a.score) FROM LearnerMapQuizAttempt a WHERE a.learnerId = :learnerId")
    Object[] getQuizPerformanceSummary(@Param("learnerId") UUID learnerId);
}
