package com.smu.csd.roles.learner;

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
@Table(schema = "roles", name = "learner")
public class Learner {
    @Id 
    @UuidGenerator
    @Column(name = "learner_id")
    private UUID learnerId;
    @Column(name = "supabase_user_id")
    private UUID supabaseUserId;
    @Column (nullable = false)
    private String username;
    @Column (nullable = false)
    private String email;
    @Column
    private String full_name;
    @Column
    private Integer total_xp;
    @Column
    private Integer level;
    @Column
    @CreationTimestamp
    private LocalDateTime created_at;
    @Column
    private LocalDateTime updated_at;
    @Column 
    private Boolean is_active;
}
