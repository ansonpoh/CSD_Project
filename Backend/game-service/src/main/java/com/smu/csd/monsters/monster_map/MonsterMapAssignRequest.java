package com.smu.csd.monsters.monster_map;

import java.util.List;
import java.util.UUID;

public record MonsterMapAssignRequest(
    UUID mapId,
    List<UUID> monsterIds
) {}
