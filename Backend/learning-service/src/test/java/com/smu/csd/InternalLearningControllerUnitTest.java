package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.contents.ratings.ContentRatingResponse;
import com.smu.csd.contents.ratings.ContentRatingService;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.dtos.LearnerAnalyticsResponse;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.missions.MissionAttempt;
import com.smu.csd.missions.MissionAttemptRepository;
import com.smu.csd.quiz.map_quiz.LearnerMapQuizAttemptRepository;
import com.smu.csd.quiz.map_quiz.MapQuizService;

public class InternalLearningControllerUnitTest {

    private InternalLearningController controller;
    private ContentRepository contentRepository;
    private ContentRatingService contentRatingService;
    private TopicService topicService;
    private MapQuizService mapQuizService;
    private LearnerMapQuizAttemptRepository quizAttemptRepository;
    private MissionAttemptRepository missionAttemptRepository;

    @BeforeEach
    public void setUp() {
        contentRepository = mock(ContentRepository.class);
        contentRatingService = mock(ContentRatingService.class);
        topicService = mock(TopicService.class);
        mapQuizService = mock(MapQuizService.class);
        quizAttemptRepository = mock(LearnerMapQuizAttemptRepository.class);
        missionAttemptRepository = mock(MissionAttemptRepository.class);
        controller = new InternalLearningController(contentRepository, contentRatingService, topicService, mapQuizService);
        ReflectionTestUtils.setField(controller, "quizAttemptRepository", quizAttemptRepository);
        ReflectionTestUtils.setField(controller, "missionAttemptRepository", missionAttemptRepository);
    }

    @Test
    public void testGetContentSuccess() throws Exception {
        UUID contentId = UUID.randomUUID();
        Content content = new Content();
        content.setContentId(contentId);
        content.setTitle("Test Content");
        content.setStatus(Content.Status.APPROVED);
        Topic topic = Topic.builder().topicId(UUID.randomUUID()).topicName("Topic").description("desc").build();
        content.setTopic(topic);
        
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content));
        when(contentRatingService.getRatingSummaryForLearner(contentId, null))
                .thenReturn(new ContentRatingResponse(contentId, 4.5, 3L, null));

        ResponseEntity<Map<String, Object>> response = controller.getContent(contentId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(contentId, response.getBody().get("contentId"));
        assertEquals(4.5, response.getBody().get("averageRating"));
        assertEquals(3L, response.getBody().get("ratingCount"));
    }

    @Test
    public void testGetContentNotFound() {
        UUID contentId = UUID.randomUUID();
        when(contentRepository.findById(contentId)).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response = controller.getContent(contentId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void testGetContentFallsBackToZeroRatingsWhenLookupThrows() throws Exception {
        UUID contentId = UUID.randomUUID();
        Content content = new Content();
        content.setContentId(contentId);
        content.setTitle("Test Content");

        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content));
        when(contentRatingService.getRatingSummaryForLearner(contentId, null)).thenThrow(new RuntimeException("down"));

        ResponseEntity<Map<String, Object>> response = controller.getContent(contentId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0.0, response.getBody().get("averageRating"));
        assertEquals(0L, response.getBody().get("ratingCount"));
    }

    @Test
    public void testGetContentsBatchReturnsEmptyListForNullOrEmptyIds() {
        assertTrue(controller.getContentsBatch(null).getBody().isEmpty());
        assertTrue(controller.getContentsBatch(List.of()).getBody().isEmpty());
    }

    @Test
    public void testGetTopicReturns404WhenTopicServiceThrowsResourceNotFoundException() throws Exception {
        UUID topicId = UUID.randomUUID();
        when(topicService.getById(topicId)).thenThrow(new ResourceNotFoundException("Topic", "id", topicId));

        ResponseEntity<Map<String, Object>> response = controller.getTopic(topicId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    public void testGetAnalyticsForLearnerMapsQuizSummaryAndMissionExpHistoryIntoResponse() {
        UUID learnerId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        MissionAttempt today = MissionAttempt.builder().learnerId(learnerId).submittedAt(now).build();
        MissionAttempt yesterday = MissionAttempt.builder().learnerId(learnerId).submittedAt(now.minusDays(1)).build();

        when(quizAttemptRepository.getQuizPerformanceSummary(learnerId)).thenReturn(new Object[] { new Object[] { 4L, 82.5 } });
        when(missionAttemptRepository.findByLearnerIdAndSubmittedAtAfter(org.mockito.Mockito.eq(learnerId), org.mockito.ArgumentMatchers.any(LocalDateTime.class)))
                .thenReturn(List.of(today, yesterday));

        ResponseEntity<LearnerAnalyticsResponse> response = controller.getAnalyticsForLearner(learnerId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(4, response.getBody().getQuizzesAttempted());
        assertEquals(82.5, response.getBody().getAverageQuizScore());
        assertEquals(7, response.getBody().getExpHistory().size());
        int expTotal = response.getBody().getExpHistory().stream().mapToInt(LearnerAnalyticsResponse.ExpHistoryEntry::getExpGained).sum();
        assertEquals(100, expTotal);
    }

    @Test
    public void testGetAnalyticsForLearnerToleratesRepositoryExceptionsAndReturnsPartial200Response() {
        UUID learnerId = UUID.randomUUID();
        when(quizAttemptRepository.getQuizPerformanceSummary(learnerId)).thenThrow(new RuntimeException("quiz down"));
        when(missionAttemptRepository.findByLearnerIdAndSubmittedAtAfter(org.mockito.Mockito.eq(learnerId), org.mockito.ArgumentMatchers.any(LocalDateTime.class)))
                .thenThrow(new RuntimeException("missions down"));

        ResponseEntity<LearnerAnalyticsResponse> response = controller.getAnalyticsForLearner(learnerId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().getQuizzesAttempted());
        assertEquals(0.0, response.getBody().getAverageQuizScore());
        assertTrue(response.getBody().getExpHistory() == null || response.getBody().getExpHistory().isEmpty());
    }
}
