package com.smu.csd.npcs;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NPCRepository extends JpaRepository<NPC, UUID> {
    
}
