package com.smu.csd.quiz.map_quiz;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MapQuizQuestionRepository extends JpaRepository<MapQuizQuestion, UUID> {
    List<MapQuizQuestion> findByQuiz_QuizIdOrderByQuestionOrder(UUID quizId);
    boolean existsByQuiz_QuizIdAndQuestionId(UUID quizId, UUID questionId);

    @Query("""
        SELECT q.questionId
        FROM MapQuizQuestion q
        WHERE q.quiz.quizId = :quizId
    """)
    List<UUID> findQuestionIdsByQuizId(@Param("quizId") UUID quizId);
}
