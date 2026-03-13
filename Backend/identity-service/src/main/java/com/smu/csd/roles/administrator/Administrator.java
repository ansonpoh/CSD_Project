package com.smu.csd.roles.administrator;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
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
@NoArgsConstructor  // JPA needs this to create an empty object before filling fields from DB
@AllArgsConstructor // Lombok's @Builder needs this internally to construct the final object
@Builder            // lets you do Contributor.builder().email("x").fullName("y").build()
@Entity
@Table(name = "administrator", schema = "roles")
public class Administrator {

    @Id
    @UuidGenerator
    @Column(name = "administrator_id")
    private UUID administratorId;

    @Column(name = "supabase_user_id")
    private UUID supabaseUserId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name")
    private String fullName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
}
