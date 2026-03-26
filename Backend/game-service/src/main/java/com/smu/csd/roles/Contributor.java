package com.smu.csd.roles;

import java.util.UUID;

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
@Table(name = "contributor", schema = "roles")
public class Contributor {
    @Id
    @Column(name = "contributor_id")
    private UUID contributorId;

    @Column(name = "supabase_user_id")
    private UUID supabaseUserId;

    @Column(name = "is_active")
    private Boolean isActive;
}
