package com.smu.csd.monsters;

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
@Table(schema = "monsters", name = "monster")
public class Monster {
    @Id
    @UuidGenerator
    private UUID monster_id;
    @Column(unique = true)
    private String name;
    @Column
    private String description;
    @Column
    private String asset;
}
