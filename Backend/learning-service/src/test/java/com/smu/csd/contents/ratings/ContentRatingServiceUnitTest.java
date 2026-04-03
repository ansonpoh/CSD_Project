package com.smu.csd.contents.ratings;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentRepository;
import com.smu.csd.contents.topics.Topic;
import com.smu.csd.dtos.LearnerDto;

public class ContentRatingServiceUnitTest {

    private ContentRepository contentRepository;
    private ContentRatingRepository contentRatingRepository;
    private RestTemplate restTemplate;
    private ContentRatingService service;

    @BeforeEach
    void setUp() {
        contentRepository = mock(ContentRepository.class);
        contentRatingRepository = mock(ContentRatingRepository.class);
        restTemplate = mock(RestTemplate.class);
        service = new ContentRatingService(contentRepository, contentRatingRepository, restTemplate);
    }

    @Test
    void updateRating_enforcesRatingBounds() {
        UUID contentId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();

        IllegalArgumentException tooLow = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateRating(contentId, supabaseUserId, 0)
        );
        assertEquals("Rating must be between 1 and 5.", tooLow.getMessage());

        IllegalArgumentException tooHigh = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateRating(contentId, supabaseUserId, 6)
        );
        assertEquals("Rating must be between 1 and 5.", tooHigh.getMessage());
    }

    @Test
    void updateRating_rejectsRatingForNonApprovedContent() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content(Content.Status.PENDING_REVIEW, contentId)));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.updateRating(contentId, supabaseUserId, 4)
        );

        assertEquals("Only approved content can be rated.", exception.getMessage());
        verify(restTemplate, never()).getForObject(anyString(), any());
        verify(contentRatingRepository, never()).save(any());
    }

    @Test
    void updateRating_createsRecordWhenNoneExists() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Content content = content(Content.Status.APPROVED, contentId);
        ContentRatingSummaryProjection summary = summary(contentId, 4.234, 2L);

        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 100, 2));
        when(contentRatingRepository.findAllByContentContentIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(contentId, learnerId))
                .thenReturn(List.of());
        when(contentRatingRepository.save(any(ContentRating.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(contentRatingRepository.summarizeByContentIds(anyList())).thenReturn(List.of(summary));
        when(contentRatingRepository.findAllByLearnerIdAndContentContentIdIn(eq(learnerId), anyList()))
                .thenReturn(List.of(existingRating(content, learnerId, 4)));

        ContentRatingResponse response = service.updateRating(contentId, supabaseUserId, 4);

        assertEquals(content.getContentId(), response.contentId());
        assertEquals(4.23, response.averageRating());
        assertEquals(2L, response.ratingCount());
        assertEquals(4, response.currentUserRating());
        verify(contentRatingRepository).save(any(ContentRating.class));
    }

    @Test
    void updateRating_deduplicatesMultipleHistoricalRowsForSameLearnerAndContent() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID supabaseUserId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        Content content = content(Content.Status.APPROVED, contentId);
        ContentRating latest = existingRating(content, learnerId, 1);
        ContentRating olderOne = existingRating(content, learnerId, 2);
        ContentRating olderTwo = existingRating(content, learnerId, 5);
        List<ContentRating> existing = new ArrayList<>(List.of(latest, olderOne, olderTwo));

        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(new LearnerDto(learnerId, 100, 2));
        when(contentRatingRepository.findAllByContentContentIdAndLearnerIdOrderByUpdatedAtDescCreatedAtDesc(contentId, learnerId))
                .thenReturn(existing);
        when(contentRatingRepository.save(any(ContentRating.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(contentRatingRepository.summarizeByContentIds(anyList()))
                .thenReturn(List.of(summary(contentId, 3.0, 1L)));
        when(contentRatingRepository.findAllByLearnerIdAndContentContentIdIn(eq(learnerId), anyList()))
                .thenReturn(List.of(existingRating(content, learnerId, 3)));

        ContentRatingResponse response = service.updateRating(contentId, supabaseUserId, 3);

        assertEquals(3, response.currentUserRating());
        verify(contentRatingRepository).deleteAll(eq(existing.subList(1, existing.size())));
        verify(contentRatingRepository).save(any(ContentRating.class));
    }

    private Content content(Content.Status status, UUID contentId) {
        return Content.builder()
                .contentId(contentId)
                .topic(Topic.builder().topicId(UUID.randomUUID()).topicName("Topic").description("Description").build())
                .title("Title")
                .description("Description")
                .body("Body")
                .status(status)
                .build();
    }

    private ContentRating existingRating(Content content, UUID learnerId, int rating) {
        return ContentRating.builder()
                .content(content)
                .learnerId(learnerId)
                .rating(rating)
                .build();
    }

    private ContentRatingSummaryProjection summary(UUID contentId, double averageRating, long ratingCount) {
        return new ContentRatingSummaryProjection() {
            @Override
            public UUID getContentId() {
                return contentId;
            }

            @Override
            public Double getAverageRating() {
                return averageRating;
            }

            @Override
            public Long getRatingCount() {
                return ratingCount;
            }
        };
    }
}
