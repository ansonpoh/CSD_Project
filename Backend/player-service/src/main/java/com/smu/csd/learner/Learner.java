package com.smu.csd.learner;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "roles", name = "learner")
public class Learner {
    @Id 
    @UuidGenerator
    @Column(name = "learner_id")
    private UUID learnerId;
    @Column(name = "supabase_user_id", nullable = false)
    private UUID supabaseUserId;
    @NotBlank(message = "Username is mandatory")
    @Column (nullable = false)
    private String username;
    @NotBlank(message = "Email is mandatory")
    @Email(message = "Email should be valid")
    @Column (nullable = false)
    private String email;
    @Column
    private String full_name;
    @Column
    private Integer total_xp;
    @Column
    private Integer level;
    @Column
    private Integer gold;
    @Column
    @CreationTimestamp
    private LocalDateTime created_at;
    @Column
    private LocalDateTime updated_at;
    @Builder.Default
    @Column(name = "is_active")
    private Boolean is_active = true;
}
