package com.smu.csd.quiz;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MapQuizRepository extends JpaRepository<MapQuiz, UUID> {
    Optional<MapQuiz> findByMap_MapId(UUID mapId);
    Optional<MapQuiz> findByMap_MapIdAndIsPublishedTrue(UUID mapId);
}
