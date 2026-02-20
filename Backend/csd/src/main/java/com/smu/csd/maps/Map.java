package com.smu.csd.maps;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "maps", name = "map")
public class Map {
    @Id
    @UuidGenerator
    @Column(name = "map_id")
    private UUID mapId;
    @Column
    private String name;
    @Column
    private String description;
    @Column
    private String asset;
    @ManyToOne
    @JoinColumn(name = "world_id")
    private World world;
}
