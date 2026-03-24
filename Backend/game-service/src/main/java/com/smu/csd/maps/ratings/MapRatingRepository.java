package com.smu.csd.maps.ratings;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MapRatingRepository extends JpaRepository<MapRating, UUID> {
    List<MapRating> findAllByLearnerIdAndMapMapIdIn(UUID learnerId, Collection<UUID> mapIds);

    List<MapRating> findAllByMapMapIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(UUID mapId, UUID learnerId);

    @Query("""
        select mr.map.mapId as mapId, avg(mr.rating) as averageRating, count(mr) as ratingCount
        from MapRating mr
        where mr.map.mapId in :mapIds
        group by mr.map.mapId
    """)
    List<MapRatingSummaryProjection> summarizeByMapIds(@Param("mapIds") Collection<UUID> mapIds);
}
