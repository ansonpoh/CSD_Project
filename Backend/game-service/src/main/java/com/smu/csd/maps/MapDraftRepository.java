package com.smu.csd.maps;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapDraftRepository extends JpaRepository<MapDraft, UUID> {
    List<MapDraft> findByContributor_ContributorIdOrderByUpdatedAtDesc(UUID contributorId);
}

