package com.smu.csd.npcs;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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
@Table(schema = "npcs", name = "npc")
public class NPC {
    @Id
    @UuidGenerator
    private UUID npc_id;
    @Column
    private String name;
    @Column
    private String asset;
}
