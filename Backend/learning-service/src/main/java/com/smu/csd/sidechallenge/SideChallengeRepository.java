package com.smu.csd.sidechallenge;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SideChallengeRepository extends JpaRepository<SideChallenge, UUID> {
    List<SideChallenge> findByMapThemeIgnoreCaseAndIsActiveTrue(String mapTheme);
}
