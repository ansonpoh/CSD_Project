package com.smu.csd.npcs.npc_map;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import com.smu.csd.contents.Content;

public interface NPCMapRepository extends JpaRepository<NPCMap, UUID> {
    List<NPCMap> findAllByMapMapId(UUID map_id);

    List<NPCMap> findAllByMapMapIdAndContentStatus(UUID map_id, Content.Status status);
}
