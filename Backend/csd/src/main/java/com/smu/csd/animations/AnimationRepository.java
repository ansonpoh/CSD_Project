package com.smu.csd.animations;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AnimationRepository extends JpaRepository<Animation, UUID> {

}
