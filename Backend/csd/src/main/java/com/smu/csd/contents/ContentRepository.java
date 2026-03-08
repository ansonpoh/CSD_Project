package com.smu.csd.contents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smu.csd.contents.topics.Topic;

public interface ContentRepository extends JpaRepository<Content, UUID>{
    List<Content> findByTitleContainingIgnoreCase(String keyword);

    List<Content> findByTopic(Topic topic);
    
    List<Content> findByStatus(Content.Status status);

    List<Content> findByContributorId(UUID contributorId);

    List<Content> findByTopicAndStatusIn(Topic topic, List<Content.Status> statuses);

    Optional<Content> findFirstByContentFingerprintAndTopicAndStatusIn(
            String contentFingerprint,
            Topic topic,
            List<Content.Status> statuses);
}
