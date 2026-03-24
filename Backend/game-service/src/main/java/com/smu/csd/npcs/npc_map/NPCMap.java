package com.smu.csd.npcs.npc_map;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.maps.Map;
import com.smu.csd.npcs.NPC;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(schema = "npcs", name = "npc_map")
public class NPCMap {
    @Id
    @UuidGenerator
    @Column(name = "npc_map_id")
    private UUID npcMapId;
    @ManyToOne
    @JoinColumn(name = "npc_id")
    private NPC npc;
    @ManyToOne
    @JoinColumn(name = "map_id")
    private Map map;
    @Column(name = "content_id")
    private UUID contentId;
}
