package com.smu.csd.learner_profile;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerProfileStateRepository extends JpaRepository<LearnerProfileState, UUID> {}
