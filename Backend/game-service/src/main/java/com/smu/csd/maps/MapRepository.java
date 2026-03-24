package com.smu.csd.maps;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MapRepository extends JpaRepository<Map, UUID>{
    
    List<Map> findByWorld_worldId(UUID world_id);
    List<Map> findByPublishedTrueOrPublishedIsNull();
    List<Map> findByStatusOrderByMapIdAsc(Map.Status status);
    List<Map> findByStatusAndPublishedFalseOrderByMapIdAsc(Map.Status status);
    List<Map> findBySubmittedByContributor_ContributorIdOrderByMapIdAsc(UUID submittedByContributorId);
}
