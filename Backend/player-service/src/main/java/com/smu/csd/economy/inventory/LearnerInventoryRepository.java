package com.smu.csd.economy.inventory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerInventoryRepository extends JpaRepository<LearnerInventory, UUID> {
    List<LearnerInventory> findByLearnerLearnerId(UUID learnerId);

    Optional<LearnerInventory> findByLearnerLearnerIdAndItemItemId(UUID learnerId,UUID itemId);
}
