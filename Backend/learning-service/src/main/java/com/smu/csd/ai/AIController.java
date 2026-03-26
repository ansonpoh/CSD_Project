package com.smu.csd.ai;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final AIService aiService;
    private final TopicService topicService;
    private final ObjectMapper objectMapper;

    public AIController(AIService aiService, TopicService topicService, ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.topicService = topicService;
        this.objectMapper = objectMapper;
    }

    /**
     * Generates AI narration lines as a preview without saving anything.
     * Called when contributor clicks the star (✦) button on the submission form.
     */
    @PostMapping("/generate-narrations")
    @PreAuthorize("hasAnyRole('CONTRIBUTOR', 'ADMIN')")
    public ResponseEntity<GenerateNarrationsResponse> generateNarrations(
            @RequestBody GenerateNarrationsRequest request) throws ResourceNotFoundException {
        String topicName = topicService.getById(request.topicId()).getTopicName();
        String rawJson = aiService.generateBody(topicName, request.title(), request.description());

        try {
            List<String> narrations = objectMapper.readValue(rawJson, new TypeReference<List<String>>() {});
            return ResponseEntity.ok(new GenerateNarrationsResponse(narrations));
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse AI-generated narrations: " + e.getMessage());
        }
    }

    public record GenerateNarrationsRequest(UUID topicId, String title, String description) {}

    public record GenerateNarrationsResponse(List<String> narrations) {}
}