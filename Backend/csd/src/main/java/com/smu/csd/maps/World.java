package com.smu.csd.maps;

import org.hibernate.annotations.UuidGenerator;
import org.hibernate.validator.constraints.UUID;

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
    private UUID world_id;
    @Column
    private String name;
    @Column
    private String description;
}
