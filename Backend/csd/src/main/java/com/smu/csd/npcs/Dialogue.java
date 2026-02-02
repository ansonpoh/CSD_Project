package com.smu.csd.npcs;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

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
@Table(schema = "npcs", name = "dialogue")
public class Dialogue {
    @Id
    @UuidGenerator
    private UUID dialogue_id;
    @ManyToOne
    @JoinColumn(name = "npc_id")
    private NPC npc;
    @Column
    private String title;
}
