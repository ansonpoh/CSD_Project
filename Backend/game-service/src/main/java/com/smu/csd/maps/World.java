package com.smu.csd.maps;

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
@Table(schema = "maps", name = "world")
public class World {
    @Id
    @UuidGenerator
    @Column(name = "world_id")
    private UUID worldId;
    @Column
    private String name;
    @Column
    private String description;
}
