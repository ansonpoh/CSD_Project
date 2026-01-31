package com.smu.csd.monsters;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class Monster {
    @Id
    @UuidGenerator
    private String monster_id;
    @Column(unique = true)
    private String name;
    @Column
    private String description;
    @Column
    private String asset;
}
