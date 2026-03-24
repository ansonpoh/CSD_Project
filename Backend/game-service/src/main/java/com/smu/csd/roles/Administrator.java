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
@Table(name = "administrator", schema = "roles")
public class Administrator {
    @Id
    @Column(name = "administrator_id")
    private UUID administratorId;

    @Column(name = "supabase_user_id")
    private UUID supabaseUserId;
}
