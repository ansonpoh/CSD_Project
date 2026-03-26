package com.smu.csd.roles.contributor.analytics;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smu.csd.roles.contributor.Contributor;

@Repository
public interface ContributorAnalyticsRepository extends JpaRepository<Contributor, UUID> {

    @Query(value = """
            select
                count(*) as totalSubmitted,
                sum(case when c.status = 'APPROVED' then 1 else 0 end) as approvedCount,
                sum(case when c.status = 'REJECTED' then 1 else 0 end) as rejectedCount,
                count(distinct case when cf.content_flag_id is not null then c.content_id end) as flaggedCount
            from contents.content c
            left join contents.content_flag cf
                on cf.content_id = c.content_id
            where c.contributor_id = :contributorId
            """, nativeQuery = true)
    ContributorModerationCountsProjection getModerationCounts(@Param("contributorId") UUID contributorId);

    @Query(value = """
            select
                c.content_id as contentId,
                c.title as title,
                coalesce(avg(cr.rating), 0) as averageRating,
                count(cr.content_rating_id) as ratingCount
            from contents.content c
            left join contents.content_rating cr
                on cr.content_id = c.content_id
            where c.contributor_id = :contributorId
                and c.status = 'APPROVED'
            group by c.content_id, c.title, c.submitted_at
            order by averageRating desc, ratingCount desc, c.submitted_at desc
            """, nativeQuery = true)
    List<ContributorContentPerformanceProjection> getTopPerformingContents(
            @Param("contributorId") UUID contributorId,
            Pageable pageable
    );

    @Query(value = """
            select
                c.content_id as contentId,
                c.title as title,
                c.status as status,
                coalesce(avg(cr.rating), 0) as averageRating,
                count(cr.content_rating_id) as ratingCount
            from contents.content c
            left join contents.content_rating cr
                on cr.content_id = c.content_id
            where c.contributor_id = :contributorId
            group by c.content_id, c.title, c.status, c.submitted_at
            order by c.submitted_at desc
            """, nativeQuery = true)
    List<ContributorContentRatingProjection> getRatingsPerContent(@Param("contributorId") UUID contributorId);
}
