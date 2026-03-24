package com.smu.csd.maps;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapSubmissionRepository extends JpaRepository<MapSubmission, UUID> {
    Optional<MapSubmission> findTopByMap_MapIdOrderBySubmittedAtDescCreatedAtDesc(UUID mapId);

    Optional<MapSubmission> findTopByMapDraft_MapDraftIdAndContributor_ContributorIdOrderBySubmittedAtDescCreatedAtDesc(
            UUID mapDraftId,
            UUID contributorId
    );
}

