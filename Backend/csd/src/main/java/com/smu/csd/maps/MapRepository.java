package com.smu.csd.maps;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MapRepository extends JpaRepository<Map, UUID>{
    
    List<Map> findByWorld_world_id(UUID world_id);
}
