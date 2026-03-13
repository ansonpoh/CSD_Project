package com.smu.csd.monsters.monster_map;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MonsterMapRepository extends JpaRepository<MonsterMap, UUID> {
    List<MonsterMap> findAllByMapMapId(UUID map_id);
}
