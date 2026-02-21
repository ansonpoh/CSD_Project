package com.smu.csd.contents;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentRepository extends JpaRepository<Content, UUID>{
    List<Content> findByTitleContainingIgnoreCase(String keyword);

    List<Content> findByTopic(Topic topic);
    
    List<Content> findByStatus(Content.Status status);

    List<Content> findByContributorId(UUID contributorId);
}
