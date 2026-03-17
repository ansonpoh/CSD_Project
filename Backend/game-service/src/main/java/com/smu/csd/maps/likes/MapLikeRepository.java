package com.smu.csd.maps.likes;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MapLikeRepository extends JpaRepository<MapLike, UUID> {
    List<MapLike> findAllByLearnerIdAndMapMapIdIn(UUID learnerId, Collection<UUID> mapIds);

    List<MapLike> findAllByMapMapIdAndLearnerIdOrderByCreatedAtAsc(UUID mapId, UUID learnerId);

    @Query("""
        select ml.map.mapId as mapId, count(ml) as likeCount
        from MapLike ml
        where ml.map.mapId in :mapIds
        group by ml.map.mapId
    """)
    List<MapLikeCountProjection> summarizeByMapIds(@Param("mapIds") Collection<UUID> mapIds);
}
