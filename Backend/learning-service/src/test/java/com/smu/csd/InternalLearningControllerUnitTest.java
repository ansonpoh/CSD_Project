package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.contents.ratings.ContentRatingService;
import com.smu.csd.contents.topics.TopicService;
import com.smu.csd.quiz.map_quiz.MapQuizService;

public class InternalLearningControllerUnitTest {

    private InternalLearningController controller;
    private ContentRepository contentRepository;
    private ContentRatingService contentRatingService;
    private TopicService topicService;
    private MapQuizService mapQuizService;

    @BeforeEach
    public void setUp() {
        contentRepository = mock(ContentRepository.class);
        contentRatingService = mock(ContentRatingService.class);
        topicService = mock(TopicService.class);
        mapQuizService = mock(MapQuizService.class);
        controller = new InternalLearningController(contentRepository, contentRatingService, topicService, mapQuizService);
    }

    @Test
    public void testGetContentSuccess() {
        UUID contentId = UUID.randomUUID();
        Content content = new Content();
        content.setContentId(contentId);
        content.setTitle("Test Content");
        
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content));

        ResponseEntity<Map<String, Object>> response = controller.getContent(contentId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(contentId, response.getBody().get("contentId"));
    }

    @Test
    public void testGetContentNotFound() {
        UUID contentId = UUID.randomUUID();
        when(contentRepository.findById(contentId)).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response = controller.getContent(contentId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
