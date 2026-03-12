package com.smu.csd.quiz;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MapQuizOptionRepository extends JpaRepository<MapQuizOption, UUID> {
    List<MapQuizOption> findByQuestion_QuestionId(UUID questionId);
}
