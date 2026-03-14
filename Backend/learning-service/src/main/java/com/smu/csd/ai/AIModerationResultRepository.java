package com.smu.csd.ai;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AIModerationResultRepository extends JpaRepository<AIModerationResult, UUID> {

    // Get the AI result for a specific piece of content
    Optional<AIModerationResult> findByContent_ContentId(UUID contentId);

    // Check if content has already been screened (avoid double-screening on resubmit)
    boolean existsByContent_ContentId(UUID contentId);

    // Power the moderator dashboard queue, e.g. findByAiVerdict(Verdict.NEEDS_REVIEW)
    List<AIModerationResult> findByAiVerdictOrderByScreenedAtDesc(AIModerationResult.Verdict aiVerdict);
}