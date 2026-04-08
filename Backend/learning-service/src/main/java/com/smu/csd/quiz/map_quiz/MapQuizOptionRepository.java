package com.smu.csd.quiz.map_quiz;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MapQuizOptionRepository extends JpaRepository<MapQuizOption, UUID> {
    interface CorrectOptionRow {
        UUID getQuestionId();
        UUID getOptionId();
    }

    List<MapQuizOption> findByQuestion_QuestionId(UUID questionId);
    List<MapQuizOption> findByQuestion_QuestionIdIn(Collection<UUID> questionIds);
    void deleteByQuestion_QuestionId(UUID questionId);

    @Query("""
        SELECT o.optionId
        FROM MapQuizOption o
        WHERE o.question.questionId = :questionId
          AND o.isCorrect = true
    """)
    List<UUID> findCorrectOptionIdsByQuestionId(@Param("questionId") UUID questionId);

    @Query("""
        SELECT o.question.questionId as questionId, o.optionId as optionId
        FROM MapQuizOption o
        WHERE o.question.questionId in :questionIds
          AND o.isCorrect = true
    """)
    List<CorrectOptionRow> findCorrectOptionIdsByQuestionIds(@Param("questionIds") Collection<UUID> questionIds);
}
