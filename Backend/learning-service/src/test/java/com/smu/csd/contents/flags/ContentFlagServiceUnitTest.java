package com.smu.csd.contents.flags;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.contents.Content;
import com.smu.csd.contents.ContentService;
import com.smu.csd.contents.topics.Topic;

public class ContentFlagServiceUnitTest {

    private ContentFlagRepository contentFlagRepository;
    private ContentService contentService;
    private ContentFlagService service;

    @BeforeEach
    void setUp() {
        contentFlagRepository = mock(ContentFlagRepository.class);
        contentService = mock(ContentService.class);
        service = new ContentFlagService(contentFlagRepository, contentService);
    }

    @Test
    void createFlag_requiresReason() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.createFlag(contentId, reporterId, null, "details")
        );

        assertEquals("Flag reason is required", exception.getMessage());
        verify(contentService, never()).getById(any());
        verify(contentFlagRepository, never()).save(any());
    }

    @Test
    void createFlag_requiresDetailsWhenReasonIsOther() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.createFlag(contentId, reporterId, ContentFlag.FlagReason.OTHER, "   ")
        );

        assertEquals("Details are required when reason is OTHER", exception.getMessage());
        verify(contentService, never()).getById(any());
        verify(contentFlagRepository, never()).save(any());
    }

    @Test
    void createFlag_rejectsNonApprovedContent() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();
        when(contentService.getById(contentId)).thenReturn(content(Content.Status.PENDING_REVIEW));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.createFlag(contentId, reporterId, ContentFlag.FlagReason.SPAM, "spam")
        );

        assertEquals("Only APPROVED content can be flagged", exception.getMessage());
        verify(contentFlagRepository, never()).save(any());
    }

    @Test
    void createFlag_rejectsDuplicateOpenFlagBySameReporter() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();
        when(contentService.getById(contentId)).thenReturn(content(Content.Status.APPROVED));
        when(contentFlagRepository.existsByContentContentIdAndReportedByAndStatus(
                contentId, reporterId, ContentFlag.FlagStatus.OPEN)).thenReturn(true);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.createFlag(contentId, reporterId, ContentFlag.FlagReason.HARASSMENT, "details")
        );

        assertEquals("You already have an open flag for this content", exception.getMessage());
        verify(contentFlagRepository, never()).save(any());
    }

    @Test
    void reviewFlag_enforcesValidReviewStatusDismissalNoteAndOpenOnlyReview() throws Exception {
        UUID flagId = UUID.randomUUID();
        UUID reviewerId = UUID.randomUUID();

        IllegalArgumentException missingStatus = assertThrows(
                IllegalArgumentException.class,
                () -> service.reviewFlag(flagId, reviewerId, null, "note")
        );
        assertEquals("Review status is required", missingStatus.getMessage());

        IllegalArgumentException invalidStatus = assertThrows(
                IllegalArgumentException.class,
                () -> service.reviewFlag(flagId, reviewerId, ContentFlag.FlagStatus.OPEN, "note")
        );
        assertEquals("Review status must be REVIEWED or DISMISSED", invalidStatus.getMessage());

        ContentFlag openFlag = ContentFlag.builder()
                .contentFlagId(flagId)
                .status(ContentFlag.FlagStatus.OPEN)
                .build();
        when(contentFlagRepository.findById(flagId)).thenReturn(Optional.of(openFlag));

        IllegalArgumentException missingResolutionNotes = assertThrows(
                IllegalArgumentException.class,
                () -> service.reviewFlag(flagId, reviewerId, ContentFlag.FlagStatus.DISMISSED, "   ")
        );
        assertEquals("Resolution notes are required when dismissing a flag", missingResolutionNotes.getMessage());

        ContentFlag reviewedFlag = ContentFlag.builder()
                .contentFlagId(flagId)
                .status(ContentFlag.FlagStatus.REVIEWED)
                .build();
        when(contentFlagRepository.findById(flagId)).thenReturn(Optional.of(reviewedFlag));

        IllegalStateException onlyOpenFlags = assertThrows(
                IllegalStateException.class,
                () -> service.reviewFlag(flagId, reviewerId, ContentFlag.FlagStatus.REVIEWED, "ok")
        );
        assertEquals("Only OPEN flags can be reviewed", onlyOpenFlags.getMessage());
        verify(contentFlagRepository, never()).save(any());
    }

    private Content content(Content.Status status) {
        return Content.builder()
                .contentId(UUID.randomUUID())
                .topic(Topic.builder().topicId(UUID.randomUUID()).topicName("Topic").description("Description").build())
                .title("Title")
                .description("Description")
                .body("Body")
                .status(status)
                .build();
    }
}
