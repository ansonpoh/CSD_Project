package com.smu.csd.learner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import jakarta.validation.ConstraintViolationException;

@DataJpaTest
public class LearnerRepositoryDataJpaTest {

    @Autowired
    private LearnerRepository learnerRepository;

    @Test
    void findByIsActiveTrue_ExcludesInactiveLearners() {
        Learner activeLearner = Learner.builder()
                .supabaseUserId(UUID.randomUUID())
                .username("active_learner")
                .email("active_learner@example.com")
                .full_name("Active Learner")
                .total_xp(120)
                .level(2)
                .gold(10)
                .is_active(true)
                .build();

        Learner inactiveLearner = Learner.builder()
                .supabaseUserId(UUID.randomUUID())
                .username("inactive_learner")
                .email("inactive_learner@example.com")
                .full_name("Inactive Learner")
                .total_xp(240)
                .level(3)
                .gold(20)
                .is_active(false)
                .build();

        learnerRepository.saveAll(List.of(activeLearner, inactiveLearner));

        List<Learner> activeOnly = learnerRepository.findByIs_activeTrue(
                org.springframework.data.domain.Sort.by("username")
        );

        assertThat(activeOnly).hasSize(1);
        assertThat(activeOnly.getFirst().getUsername()).isEqualTo("active_learner");
    }

    @Test
    void existsBySupabaseUserIdAndIsActiveTrue_ReturnsFalseForInactiveLearner() {
        UUID supabaseUserId = UUID.randomUUID();

        Learner inactiveLearner = Learner.builder()
                .supabaseUserId(supabaseUserId)
                .username("inactive_user")
                .email("inactive_user@example.com")
                .full_name("Inactive User")
                .total_xp(0)
                .level(1)
                .gold(0)
                .is_active(false)
                .build();

        learnerRepository.saveAndFlush(inactiveLearner);

        boolean existsAsActive = learnerRepository.existsBySupabaseUserIdAndIs_activeTrue(supabaseUserId);
        assertThat(existsAsActive).isFalse();
    }

    @Test
    void saveAndFlush_WithMissingUsername_ThrowsConstraintViolation() {
        Learner invalidLearner = Learner.builder()
                .supabaseUserId(UUID.randomUUID())
                .email("missing_username@example.com")
                .full_name("Missing Username")
                .total_xp(0)
                .level(1)
                .gold(0)
                .is_active(true)
                .build();

        assertThatThrownBy(() -> learnerRepository.saveAndFlush(invalidLearner))
                .isInstanceOf(ConstraintViolationException.class);
    }
}
