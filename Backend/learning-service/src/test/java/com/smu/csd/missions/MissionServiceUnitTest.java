package com.smu.csd.missions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.ai.AIService;
import com.smu.csd.dtos.LearnerDto;

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
