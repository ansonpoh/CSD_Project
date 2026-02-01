package com.smu.csd.monsters;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MonsterRepository extends JpaRepository<Monster, UUID>{
    
}
