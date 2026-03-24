package com.smu.csd.chat;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatUserSettingsRepository extends JpaRepository<ChatUserSettings, UUID> {
    Optional<ChatUserSettings> findByOwnerLearnerIdAndTargetLearnerId(UUID ownerLearnerId, UUID targetLearnerId);

    List<ChatUserSettings> findByOwnerLearnerIdAndTargetLearnerIdIn(UUID ownerLearnerId, Collection<UUID> targetLearnerIds);

    boolean existsByOwnerLearnerIdAndTargetLearnerIdAndIsBlockedTrue(UUID ownerLearnerId, UUID targetLearnerId);
}
