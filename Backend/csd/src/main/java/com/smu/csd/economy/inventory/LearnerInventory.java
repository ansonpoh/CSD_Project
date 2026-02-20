package com.smu.csd.economy.inventory;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.economy.item.Item;
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
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(schema = "economy", name = "learner_inventory")
public class LearnerInventory {
    @Id
    @UuidGenerator
    private UUID learner_inventory_id;
    @ManyToOne
    @JoinColumn(name = "learner_id", nullable = false)
    private Learner learner;
    @ManyToOne
    @JoinColumn(name = "item_id")
    private Item item;
    @Column
    private Integer quantity;
    @Column 
    private Boolean is_equipped;
    @Column
    private LocalDateTime acquired_at;
    @Column
    private LocalDateTime updated_at;
}
