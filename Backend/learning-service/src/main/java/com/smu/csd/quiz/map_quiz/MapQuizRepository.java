package com.smu.csd.quiz.map_quiz;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MapQuizRepository extends JpaRepository<MapQuiz, UUID> {
    Optional<MapQuiz> findByMapId(UUID mapId);
    Optional<MapQuiz> findByMapIdAndIsPublishedTrue(UUID mapId);
}
