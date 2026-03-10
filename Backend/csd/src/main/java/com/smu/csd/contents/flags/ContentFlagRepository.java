package com.smu.csd.contents.flags;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smu.csd.roles.learner.Learner;

public interface ContentFlagRepository extends JpaRepository<ContentFlag, UUID> {
    boolean existsByContentContentIdAndReportedByAndStatus(
            UUID contentId,
            Learner reportedBy,
            ContentFlag.FlagStatus status
    );

    List<ContentFlag> findByStatusOrderByCreatedAtAsc(ContentFlag.FlagStatus status);

    List<ContentFlag> findByContentContentIdOrderByCreatedAtDesc(UUID contentId);
}

