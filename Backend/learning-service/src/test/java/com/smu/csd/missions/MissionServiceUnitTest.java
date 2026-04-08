package com.smu.csd.missions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.smu.csd.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.ai.AIService;
import com.smu.csd.dtos.LearnerDto;
import org.mockito.ArgumentCaptor;

public class MissionServiceUnitTest {

    private MissionRepository missionRepository;
    private LearnerDailyMissionRepository dailyMissionRepository;
    private MissionAttemptRepository attemptRepository;
    private AIService aiService;
    private RestTemplate restTemplate;
    private MissionService service;

    @BeforeEach
    void setUp() {
        missionRepository = mock(MissionRepository.class);
        dailyMissionRepository = mock(LearnerDailyMissionRepository.class);
        attemptRepository = mock(MissionAttemptRepository.class);
        aiService = mock(AIService.class);
        restTemplate = mock(RestTemplate.class);
        service = new MissionService(missionRepository, dailyMissionRepository, attemptRepository, aiService, restTemplate);
    }

    @Test
    void createMission_SavesMissionWithProvidedValues() {
        when(missionRepository.save(any(Mission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Mission created = service.createMission("Observe flora", "Observe local flora", Mission.Type.OBSERVATION, 30, 10);

        assertEquals("Observe flora", created.getTitle());
        assertEquals(Mission.Type.OBSERVATION, created.getType());
        assertEquals(30, created.getRewardXp());
        assertEquals(10, created.getRewardGold());
        verify(missionRepository).save(any(Mission.class));
    }

    @Test
    void getAllMissions_NormalizesNegativePageAndNonPositiveSize() {
        when(missionRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        service.getAllMissions(-2, 0);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(missionRepository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(100, pageable.getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("createdAt").getDirection());
    }

    @Test
    void getAllMissions_ClampsRequestedSizeToMaximum() {
        when(missionRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        service.getAllMissions(1, 999);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(missionRepository).findAll(pageableCaptor.capture());
        assertEquals(500, pageableCaptor.getValue().getPageSize());
    }

    @Test
    void getAllMissions_DefaultOverloadUsesDefaultPagination() {
        when(missionRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        service.getAllMissions();

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(missionRepository).findAll(pageableCaptor.capture());
        assertEquals(0, pageableCaptor.getValue().getPageNumber());
        assertEquals(100, pageableCaptor.getValue().getPageSize());
    }

    @Test
    void setActive_ThrowsWhenMissionMissing() {
        UUID missionId = UUID.randomUUID();
        when(missionRepository.findById(missionId)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> service.setActive(missionId, true)
        );

        assertTrue(exception.getMessage().contains(missionId.toString()));
    }

    @Test
    void setActive_UpdatesAndSavesMission() throws Exception {
        UUID missionId = UUID.randomUUID();
        Mission mission = mission(missionId, "Set active mission", 10, 5);
        mission.setActive(false);
        when(missionRepository.findById(missionId)).thenReturn(Optional.of(mission));
        when(missionRepository.save(any(Mission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Mission updated = service.setActive(missionId, true);

        assertTrue(updated.isActive());
        verify(missionRepository).save(mission);
    }

    @Test
    void getFlaggedAttempts_ReturnsFlaggedRows() {
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .status(MissionAttempt.Status.FLAGGED_FOR_REVIEW)
                .build();
        when(attemptRepository.findByStatus(MissionAttempt.Status.FLAGGED_FOR_REVIEW))
                .thenReturn(List.of(attempt));

        List<MissionAttempt> flagged = service.getFlaggedAttempts();

        assertEquals(1, flagged.size());
        assertEquals(attempt.getAttemptId(), flagged.get(0).getAttemptId());
    }

    @Test
    void adminReview_ApprovePathGrantsReward() throws Exception {
        UUID learnerId = UUID.randomUUID();
        Mission mission = mission("Reward mission", 40, 20);
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .learnerId(learnerId)
                .mission(mission)
                .status(MissionAttempt.Status.FLAGGED_FOR_REVIEW)
                .build();
        when(attemptRepository.findById(attempt.getAttemptId())).thenReturn(Optional.of(attempt));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class)))
                .thenReturn(new LearnerDto(learnerId, 10, 1));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(Map.of());
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MissionAttempt reviewed = service.adminReview(attempt.getAttemptId(), true, "approved by admin");

        assertEquals(MissionAttempt.Status.APPROVED, reviewed.getStatus());
        assertEquals("approved by admin", reviewed.getAiReviewNote());
        assertTrue(reviewed.isRewardClaimed());
        verify(restTemplate).postForObject(anyString(), any(HttpEntity.class), eq(Map.class));
    }

    @Test
    void adminReview_RejectPathDoesNotGrantReward() throws Exception {
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .mission(mission("Reject mission", 20, 5))
                .status(MissionAttempt.Status.FLAGGED_FOR_REVIEW)
                .build();
        when(attemptRepository.findById(attempt.getAttemptId())).thenReturn(Optional.of(attempt));
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MissionAttempt reviewed = service.adminReview(attempt.getAttemptId(), false, "off-topic");

        assertEquals(MissionAttempt.Status.REJECTED, reviewed.getStatus());
        assertFalse(reviewed.isRewardClaimed());
        verify(restTemplate, never()).postForObject(anyString(), any(), eq(Map.class));
    }

    @Test
    void adminReview_ApproveSkipsRewardWhenAlreadyClaimed() throws Exception {
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .mission(mission("Already rewarded", 10, 3))
                .status(MissionAttempt.Status.FLAGGED_FOR_REVIEW)
                .rewardClaimed(true)
                .build();
        when(attemptRepository.findById(attempt.getAttemptId())).thenReturn(Optional.of(attempt));
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MissionAttempt reviewed = service.adminReview(attempt.getAttemptId(), true, "already done");

        assertEquals(MissionAttempt.Status.APPROVED, reviewed.getStatus());
        assertTrue(reviewed.isRewardClaimed());
        verify(restTemplate, never()).getForObject(anyString(), eq(LearnerDto.class));
        verify(restTemplate, never()).postForObject(anyString(), any(), eq(Map.class));
    }

    @Test
    void adminReview_ThrowsWhenAttemptMissing() {
        UUID attemptId = UUID.randomUUID();
        when(attemptRepository.findById(attemptId)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> service.adminReview(attemptId, true, "note")
        );

        assertTrue(exception.getMessage().contains(attemptId.toString()));
    }

    @Test
    void getDailyMissions_topsUpWhenActivePlusCompletedBelowDailyCap() {
        UUID learnerId = UUID.randomUUID();
        Mission existingMission = mission("Existing mission", 25, 10);
        Mission topUpMission = mission("Top up mission", 50, 20);
        LearnerDailyMission completed = dailyMission(existingMission, learnerId, LocalDate.now(), LearnerDailyMission.Status.COMPLETED);
        LearnerDailyMission active = dailyMission(topUpMission, learnerId, LocalDate.now(), LearnerDailyMission.Status.ACTIVE);

        when(dailyMissionRepository.findByLearnerIdAndAssignedDate(learnerId, LocalDate.now()))
                .thenReturn(List.of(completed))
                .thenReturn(List.of(completed, active));
        when(missionRepository.findRandomActive(1)).thenReturn(List.of(topUpMission));
        when(dailyMissionRepository.save(any(LearnerDailyMission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<LearnerDailyMission> result = service.getDailyMissions(learnerId);

        assertEquals(1, result.size());
        assertEquals(active.getMission().getMissionId(), result.get(0).getMission().getMissionId());
        verify(missionRepository).findRandomActive(1);
        verify(dailyMissionRepository).save(any(LearnerDailyMission.class));
    }

    @Test
    void getDailyMissions_doesNotTopUpWhenDailyCapAlreadyReached() {
        UUID learnerId = UUID.randomUUID();
        Mission first = mission("First", 25, 10);
        Mission second = mission("Second", 25, 10);
        LearnerDailyMission completedOne = dailyMission(first, learnerId, LocalDate.now(), LearnerDailyMission.Status.COMPLETED);
        LearnerDailyMission completedTwo = dailyMission(second, learnerId, LocalDate.now(), LearnerDailyMission.Status.COMPLETED);

        when(dailyMissionRepository.findByLearnerIdAndAssignedDate(learnerId, LocalDate.now()))
                .thenReturn(List.of(completedOne, completedTwo));

        List<LearnerDailyMission> result = service.getDailyMissions(learnerId);

        assertTrue(result.isEmpty());
        verify(missionRepository, never()).findRandomActive(anyInt());
        verify(dailyMissionRepository, never()).save(any());
    }

    @Test
    void submitReflection_approvedPathGrantsRewardAndMarksMissionCompleted() throws Exception {
        UUID learnerId = UUID.randomUUID();
        UUID missionId = UUID.randomUUID();
        Mission mission = mission(missionId, "Approved mission", 75, 35);
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .learnerId(learnerId)
                .mission(mission)
                .reflection("I completed it")
                .build();
        LearnerDailyMission dailyMission = dailyMission(mission, learnerId, LocalDate.now(), LearnerDailyMission.Status.ACTIVE);

        when(missionRepository.findById(missionId)).thenReturn(Optional.of(mission));
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(aiService.reviewReflection(mission.getTitle(), mission.getDescription(), attempt.getReflection()))
                .thenReturn(new AIService.ReflectionReviewResult("APPROVED", "Good reflection"));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class)))
                .thenReturn(new LearnerDto(learnerId, 100, 2));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(Map.of());
        when(dailyMissionRepository.findByLearnerIdAndAssignedDate(learnerId, LocalDate.now()))
                .thenReturn(List.of(dailyMission));
        when(dailyMissionRepository.save(any(LearnerDailyMission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MissionAttempt result = service.submitReflection(learnerId, missionId, attempt.getReflection());

        assertEquals(MissionAttempt.Status.APPROVED, result.getStatus());
        assertTrue(result.isRewardClaimed());
        verify(restTemplate).postForObject(anyString(), any(HttpEntity.class), eq(Map.class));
        verify(dailyMissionRepository).save(any(LearnerDailyMission.class));
        verify(attemptRepository, org.mockito.Mockito.times(2)).save(any(MissionAttempt.class));
    }

    @Test
    void submitReflection_rejectedOrFlaggedPathDoesNotGrantReward() throws Exception {
        UUID learnerId = UUID.randomUUID();
        UUID missionId = UUID.randomUUID();
        Mission mission = mission(missionId, "Review mission", 50, 20);
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .learnerId(learnerId)
                .mission(mission)
                .reflection("not related")
                .build();

        when(missionRepository.findById(missionId)).thenReturn(Optional.of(mission));
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class)))
                .thenReturn(new LearnerDto(learnerId, 100, 2));
        when(aiService.reviewReflection(mission.getTitle(), mission.getDescription(), attempt.getReflection()))
                .thenReturn(new AIService.ReflectionReviewResult("REJECTED", "Off topic"));

        MissionAttempt rejected = service.submitReflection(learnerId, missionId, attempt.getReflection());

        assertEquals(MissionAttempt.Status.REJECTED, rejected.getStatus());
        assertFalse(rejected.isRewardClaimed());
        verify(restTemplate, never()).postForObject(anyString(), any(), eq(Map.class));
        verify(dailyMissionRepository, never()).save(any());

        when(aiService.reviewReflection(mission.getTitle(), mission.getDescription(), attempt.getReflection()))
                .thenReturn(new AIService.ReflectionReviewResult("FLAGGED_FOR_REVIEW", "Unclear"));

        MissionAttempt flagged = service.submitReflection(learnerId, missionId, attempt.getReflection());

        assertEquals(MissionAttempt.Status.FLAGGED_FOR_REVIEW, flagged.getStatus());
        assertFalse(flagged.isRewardClaimed());
        verify(restTemplate, never()).postForObject(anyString(), any(), eq(Map.class));
        verify(dailyMissionRepository, never()).save(any());
    }

    @Test
    void submitReflection_ThrowsWhenMissionMissing() {
        UUID learnerId = UUID.randomUUID();
        UUID missionId = UUID.randomUUID();
        when(missionRepository.findById(missionId)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> service.submitReflection(learnerId, missionId, "reflection")
        );

        assertTrue(exception.getMessage().contains(missionId.toString()));
        verify(attemptRepository, never()).save(any(MissionAttempt.class));
    }

    @Test
    void submitReflection_ApprovedWithUnknownLearnerSkipsRewardButCompletesDailyMission() throws Exception {
        UUID learnerId = UUID.randomUUID();
        UUID missionId = UUID.randomUUID();
        Mission mission = mission(missionId, "Approved mission", 75, 35);
        LearnerDailyMission dailyMission = dailyMission(mission, learnerId, LocalDate.now(), LearnerDailyMission.Status.ACTIVE);

        when(missionRepository.findById(missionId)).thenReturn(Optional.of(mission));
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(aiService.reviewReflection(mission.getTitle(), mission.getDescription(), "solid reflection"))
                .thenReturn(new AIService.ReflectionReviewResult("APPROVED", "Good reflection"));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class))).thenReturn(null);
        when(dailyMissionRepository.findByLearnerIdAndAssignedDate(learnerId, LocalDate.now()))
                .thenReturn(List.of(dailyMission));
        when(dailyMissionRepository.save(any(LearnerDailyMission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MissionAttempt result = service.submitReflection(learnerId, missionId, "solid reflection");

        assertEquals(MissionAttempt.Status.APPROVED, result.getStatus());
        assertFalse(result.isRewardClaimed());
        verify(restTemplate, never()).postForObject(anyString(), any(), eq(Map.class));
        verify(dailyMissionRepository).save(any(LearnerDailyMission.class));
    }

    @Test
    void adminReview_ApproveWhenRewardCallFailsStillSavesApprovedAttempt() throws Exception {
        UUID learnerId = UUID.randomUUID();
        MissionAttempt attempt = MissionAttempt.builder()
                .attemptId(UUID.randomUUID())
                .learnerId(learnerId)
                .mission(mission("Reward mission", 40, 20))
                .status(MissionAttempt.Status.FLAGGED_FOR_REVIEW)
                .build();
        when(attemptRepository.findById(attempt.getAttemptId())).thenReturn(Optional.of(attempt));
        when(restTemplate.getForObject(anyString(), eq(LearnerDto.class)))
                .thenThrow(new RuntimeException("player service down"));
        when(attemptRepository.save(any(MissionAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MissionAttempt reviewed = service.adminReview(attempt.getAttemptId(), true, "approved despite reward error");

        assertEquals(MissionAttempt.Status.APPROVED, reviewed.getStatus());
        assertFalse(reviewed.isRewardClaimed());
        verify(attemptRepository, times(1)).save(any(MissionAttempt.class));
    }

    private Mission mission(String title, int rewardXp, int rewardGold) {
        return mission(UUID.randomUUID(), title, rewardXp, rewardGold);
    }

    private Mission mission(UUID missionId, String title, int rewardXp, int rewardGold) {
        return Mission.builder()
                .missionId(missionId)
                .title(title)
                .description(title + " description")
                .type(Mission.Type.OBSERVATION)
                .rewardXp(rewardXp)
                .rewardGold(rewardGold)
                .isActive(true)
                .build();
    }

    private LearnerDailyMission dailyMission(Mission mission, UUID learnerId, LocalDate assignedDate, LearnerDailyMission.Status status) {
        return LearnerDailyMission.builder()
                .id(UUID.randomUUID())
                .mission(mission)
                .learnerId(learnerId)
                .assignedDate(assignedDate)
                .status(status)
                .build();
    }
}
