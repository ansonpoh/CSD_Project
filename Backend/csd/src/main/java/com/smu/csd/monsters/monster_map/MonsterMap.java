package com.smu.csd.monsters.monster_map;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.smu.csd.maps.Map;
import com.smu.csd.monsters.Monster;

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
@Table(schema = "monsters", name = "monster_map")
public class MonsterMap {
    @Id
    @UuidGenerator
    private UUID monster_map_id;
    @ManyToOne
    @JoinColumn(name = "monster_id")
    private Monster monster;
    @ManyToOne
    @JoinColumn(name = "map_id")
    private Map map;    
}
