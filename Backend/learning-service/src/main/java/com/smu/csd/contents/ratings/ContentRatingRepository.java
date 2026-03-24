package com.smu.csd.contents.ratings;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContentRatingRepository extends JpaRepository<ContentRating, UUID> {
    List<ContentRating> findAllByLearnerIdAndContentContentIdIn(UUID learnerId, Collection<UUID> contentIds);

    List<ContentRating> findAllByContentContentIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(UUID contentId, UUID learnerId);

    @Query("""
        select cr.content.contentId as contentId, avg(cr.rating) as averageRating, count(cr) as ratingCount
        from ContentRating cr
        where cr.content.contentId in :contentIds
        group by cr.content.contentId
    """)
    List<ContentRatingSummaryProjection> summarizeByContentIds(@Param("contentIds") Collection<UUID> contentIds);
}
