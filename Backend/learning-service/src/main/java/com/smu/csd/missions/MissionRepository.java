package com.smu.csd.missions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface MissionRepository extends JpaRepository<Mission, UUID> {

    List<Mission> findByIsActiveTrue();

    @Query(value = "SELECT * FROM missions.mission WHERE is_active = true ORDER BY RANDOM() LIMIT :limit", nativeQuery = true)
    List<Mission> findRandomActive(int limit);
}
