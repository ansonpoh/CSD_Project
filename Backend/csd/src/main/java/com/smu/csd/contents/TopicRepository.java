package com.smu.csd.contents;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TopicRepository extends JpaRepository<Topic, UUID>{
    Optional<Topic> findByTopicName(String topicName);

    boolean existsByTopicName(String topicName);
}
