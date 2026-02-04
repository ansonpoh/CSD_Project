package com.smu.csd.animations;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
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
@Table(schema = "animations", name = "animation")
public class Animation {
    @Id
    @UuidGenerator
    private UUID animation_id;
    @Column
    private String asset;
    @Column
    private String storage_path;
    @Column
    private String description;
    @Column(updatable = false)
    @CreationTimestamp
    private LocalDateTime created_at;
}
