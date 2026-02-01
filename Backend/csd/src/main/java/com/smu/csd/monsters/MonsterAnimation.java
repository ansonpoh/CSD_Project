package com.smu.csd.monsters;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

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

import com.smu.csd.animations.Animation;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "monsters", name = "monster_animation")
public class MonsterAnimation {
    @Id
    @UuidGenerator
    private UUID monster_animation_id;
    @ManyToOne
    @JoinColumn(name = "monster_id")
    private Monster monster;
    @ManyToOne
    @JoinColumn(name = "animation_id")
    private Animation animation;
    @Column
    private String event;
}
