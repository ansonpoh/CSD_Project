package com.smu.csd.sidechallenge;

import java.io.Serializable;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class SideChallengeProgressId implements Serializable {
    @Column(name = "learner_id")
    private UUID learnerId;

    @Column(name = "side_challenge_id")
    private UUID sideChallengeId;
}
