package com.smu.csd.npcs.npc_map;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.contents.Content;
import com.smu.csd.maps.Map;
import com.smu.csd.npcs.NPC;

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
    private UUID npc_map_id;
    @ManyToOne
    @JoinColumn(name = "npc_id")
    private NPC npc;
    @ManyToOne
    @JoinColumn(name = "map_id")
    private Map map;
    @ManyToOne
    @JoinColumn(name = "content_id")
    private Content content;
}
