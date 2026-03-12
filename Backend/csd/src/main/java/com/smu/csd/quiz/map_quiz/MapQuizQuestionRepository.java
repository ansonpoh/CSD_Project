package com.smu.csd.quiz.map_quiz;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MapQuizQuestionRepository extends JpaRepository<MapQuizQuestion, UUID> {
    List<MapQuizQuestion> findByQuiz_QuizIdOrderByQuestionOrder(UUID quizId);
}
