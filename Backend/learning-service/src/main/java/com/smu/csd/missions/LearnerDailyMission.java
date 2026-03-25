package com.smu.csd.missions;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(schema = "missions", name = "learner_daily_mission")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearnerDailyMission {

    public enum Status { ACTIVE, COMPLETED }

    @Id
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @Column(name = "assigned_date", nullable = false)
    private LocalDate assignedDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;
}
