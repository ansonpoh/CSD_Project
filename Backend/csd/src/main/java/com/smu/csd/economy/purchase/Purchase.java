package com.smu.csd.economy.purchase;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.roles.learner.Learner;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "economy", name = "purchases")
public class Purchase {
    @Id
    @UuidGenerator
    private UUID purchase_id;
    @ManyToOne
    @JoinColumn(name = "learner_id")
    private Learner learner;
    @Column
    private LocalDateTime purchased_at;
    @Column
    private Float total_cost;
}
