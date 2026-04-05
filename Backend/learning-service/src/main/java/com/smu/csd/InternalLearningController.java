package com.smu.csd;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.contents.ratings.ContentRatingResponse;
import com.smu.csd.contents.ratings.ContentRatingService;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.quiz.map_quiz.MapQuizService;

import lombok.RequiredArgsConstructor;

import com.smu.csd.dtos.LearnerAnalyticsResponse;
import com.smu.csd.missions.MissionAttempt;
import com.smu.csd.missions.MissionAttemptRepository;
import com.smu.csd.quiz.map_quiz.LearnerMapQuizAttemptRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Controller for internal inter-service communication (e.g., game-service calling for Content).
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalLearningController {

    private final ContentRepository contentRepository;
    private final ContentRatingService contentRatingService;
    private final TopicService topicService;
    private final MapQuizService mapQuizService;

    @GetMapping("/contents/{id}")
    public ResponseEntity<Map<String, Object>> getContent(@PathVariable UUID id) {
        return contentRepository.findById(id).map(c -> {
            return ResponseEntity.ok(buildContentPayload(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/contents/batch")
    public ResponseEntity<List<Map<String, Object>>> getContentsBatch(@RequestBody List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Map<String, Object>> payload = contentRepository.findAllById(ids).stream()
            .map(this::buildContentPayload)
            .toList();
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/topics/{id}")
    public ResponseEntity<Map<String, Object>> getTopic(@PathVariable UUID id) {
        try {
            Topic topic = topicService.getById(id);
            Map<String, Object> payload = new HashMap<>();
            payload.put("topicId", topic.getTopicId());
            payload.put("topicName", topic.getTopicName());
            payload.put("description", topic.getDescription());
            return ResponseEntity.ok(payload);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/map-quizzes/passed")
    public ResponseEntity<Boolean> hasPassedPublishedMapQuiz(
        @RequestParam UUID learnerId,
        @RequestParam UUID mapId
    ) {
        return ResponseEntity.ok(mapQuizService.hasPassedPublishedQuizForLearner(learnerId, mapId));
    }

    @Autowired
    private LearnerMapQuizAttemptRepository quizAttemptRepository;

    @Autowired
    private MissionAttemptRepository missionAttemptRepository;

    @GetMapping("/learning/analytics/{learnerId}")
    public ResponseEntity<LearnerAnalyticsResponse> getAnalyticsForLearner(@PathVariable UUID learnerId) {
        LearnerAnalyticsResponse response = new LearnerAnalyticsResponse();

        // 1. Fetch Quiz Stats (AC 5)
        try {
            Object[] quizSummary = quizAttemptRepository.getQuizPerformanceSummary(learnerId);
            if (quizSummary != null && quizSummary.length > 0 && quizSummary[0] instanceof Object[]) {
                Object[] data = (Object[]) quizSummary[0];
                if (data[0] != null) response.setQuizzesAttempted(((Number) data[0]).intValue());
                if (data[1] != null) response.setAverageQuizScore(((Number) data[1]).doubleValue());
            }
        } catch (Exception e) {
            System.err.println("Error fetching quiz summary: " + e.getMessage());
        }

        // 2. Fetch EXP Graph (AC 3) - Last 7 Days of Missions
        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            List<MissionAttempt> recentMissions = missionAttemptRepository.findByLearnerIdAndSubmittedAtAfter(learnerId, sevenDaysAgo);

            // Setup a map of the last 7 days defaulting to 0 EXP
            Map<LocalDate, Integer> last7DaysExp = new LinkedHashMap<>();
            LocalDate today = LocalDate.now();
            for (int i = 6; i >= 0; i--) {
                last7DaysExp.put(today.minusDays(i), 0);
            }

            // Sum the EXP grouped by Date
            for (MissionAttempt attempt : recentMissions) {
                if (attempt.getSubmittedAt() != null) {
                    LocalDate attemptDate = attempt.getSubmittedAt().toLocalDate();
                    if (last7DaysExp.containsKey(attemptDate)) {
                        int currentExp = last7DaysExp.get(attemptDate);
                        // Using a default value of 50 EXP per completed mission if your entity doesn't track it
                        last7DaysExp.put(attemptDate, currentExp + 50); 
                    }
                }
            }

            // Format for DTO
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd");
            List<LearnerAnalyticsResponse.ExpHistoryEntry> graphData = new ArrayList<>();
            for (Map.Entry<LocalDate, Integer> entry : last7DaysExp.entrySet()) {
                graphData.add(new LearnerAnalyticsResponse.ExpHistoryEntry(entry.getKey().format(formatter), entry.getValue()));
            }
            response.setExpHistory(graphData);
            
        } catch (Exception e) {
            System.err.println("Error fetching EXP history: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> buildContentPayload(Content c) {
        ContentRatingResponse rating = null;
        try {
            rating = contentRatingService.getRatingSummaryForLearner(c.getContentId(), null);
        } catch (Exception ignored) {
            rating = null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("contentId", c.getContentId());
        map.put("title", c.getTitle());
        map.put("body", c.getBody());
        map.put("topicId", c.getTopic() != null ? c.getTopic().getTopicId() : null);
        map.put("topicName", c.getTopic() != null ? c.getTopic().getTopicName() : null);
        map.put("videoUrl", c.getVideoUrl());
        map.put("status", c.getStatus() != null ? c.getStatus().name() : "DRAFT");
        map.put("averageRating", rating == null ? 0.0 : rating.averageRating());
        map.put("ratingCount", rating == null ? 0L : rating.ratingCount());
        return map;
    }
}
