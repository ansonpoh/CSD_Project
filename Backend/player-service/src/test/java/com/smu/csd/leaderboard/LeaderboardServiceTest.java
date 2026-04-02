package com.smu.csd.leaderboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;

import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;
import com.smu.csd.redis.RedisExecutor;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    private static final String KEY = "leaderboard:xp";

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private LearnerRepository learnerRepository;
    @Mock
    private RedisExecutor redisExecutor;
    @Mock
    private ZSetOperations<String, String> zsetOps;

    @InjectMocks
    private LeaderboardService leaderboardService;

    @Test
    void upsertLearnerScore_noOpWhenLearnerOrIdMissing() {
        leaderboardService.upsertLearnerScore(null);
        leaderboardService.upsertLearnerScore(Learner.builder().learnerId(null).build());

        verify(redisExecutor, never()).run(any(), any());
    }

    @Test
    void upsertLearnerScore_normalizesNegativeXpToZero() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = Learner.builder().learnerId(learnerId).total_xp(-20).build();

        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        doAnswer(invocation -> {
            Runnable action = invocation.getArgument(1);
            action.run();
            return null;
        }).when(redisExecutor).run(any(), any());

        leaderboardService.upsertLearnerScore(learner);

        verify(zsetOps).add(KEY, learnerId.toString(), 0.0);
    }

    @Test
    void removeLearner_noOpWhenLearnerIdMissing() {
        leaderboardService.removeLearner(null);

        verify(redisExecutor, never()).run(any(), any());
    }

    @Test
    void removeLearner_removesFromRedis() {
        UUID learnerId = UUID.randomUUID();
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        doAnswer(invocation -> {
            Runnable action = invocation.getArgument(1);
            action.run();
            return null;
        }).when(redisExecutor).run(any(), any());

        leaderboardService.removeLearner(learnerId);

        verify(zsetOps).remove(KEY, learnerId.toString());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getTop_clampsLimitToMaxHundredAndReadsFromRedis() {
        UUID learnerId = UUID.randomUUID();
        Set<TypedTuple<String>> tuples = new LinkedHashSet<>();
        tuples.add(new org.springframework.data.redis.core.DefaultTypedTuple<>(learnerId.toString(), 150.0));

        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.reverseRangeWithScores(KEY, 0, 99)).thenReturn(tuples);
        when(zsetOps.reverseRank(KEY, learnerId.toString())).thenReturn(0L);
        when(learnerRepository.findAllById(List.of(learnerId))).thenReturn(List.of(
                Learner.builder().learnerId(learnerId).username("alice").build()
        ));
        when(redisExecutor.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<List<LeaderboardEntryResponse>> supplier = invocation.getArgument(1);
            return supplier.get();
        });

        List<LeaderboardEntryResponse> result = leaderboardService.getTop(500);

        assertEquals(1, result.size());
        assertEquals("alice", result.get(0).username());
        assertEquals(150, result.get(0).totalXp());
        assertEquals(1L, result.get(0).rank());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getTop_returnsEmptyWhenRedisReturnsNoTuples() {
        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.reverseRangeWithScores(KEY, 0, 4)).thenReturn(null);
        when(redisExecutor.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<List<LeaderboardEntryResponse>> supplier = invocation.getArgument(1);
            return supplier.get();
        });

        List<LeaderboardEntryResponse> result = leaderboardService.getTop(5);

        assertEquals(List.of(), result);
        verify(learnerRepository, never()).findAllById(any());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getTop_skipsRedisEntriesWithoutRank() {
        UUID learnerId = UUID.randomUUID();
        Set<TypedTuple<String>> tuples = new LinkedHashSet<>();
        tuples.add(new org.springframework.data.redis.core.DefaultTypedTuple<>(learnerId.toString(), 10.4));
        tuples.add(new org.springframework.data.redis.core.DefaultTypedTuple<>(null, 77.0));

        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(zsetOps.reverseRangeWithScores(KEY, 0, 9)).thenReturn(tuples);
        when(learnerRepository.findAllById(List.of(learnerId))).thenReturn(List.of(
                Learner.builder().learnerId(learnerId).username("alice").build()
        ));
        when(zsetOps.reverseRank(KEY, learnerId.toString())).thenReturn(null);
        when(redisExecutor.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<List<LeaderboardEntryResponse>> supplier = invocation.getArgument(1);
            return supplier.get();
        });

        List<LeaderboardEntryResponse> result = leaderboardService.getTop(10);

        assertEquals(List.of(), result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void getTop_usesDatabaseFallbackWhenRedisUnavailable() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = Learner.builder().learnerId(learnerId).username("bob").total_xp(44).build();
        Page<Learner> page = new PageImpl<>(List.of(learner));

        when(redisExecutor.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<List<LeaderboardEntryResponse>> fallback = invocation.getArgument(2);
            return fallback.get();
        });
        when(learnerRepository.findAll(any(PageRequest.class))).thenReturn(page);

        List<LeaderboardEntryResponse> result = leaderboardService.getTop(0);

        assertEquals(1, result.size());
        assertEquals(learnerId, result.get(0).learnerId());
        assertEquals(44, result.get(0).totalXp());

        ArgumentCaptor<PageRequest> captor = ArgumentCaptor.forClass(PageRequest.class);
        verify(learnerRepository).findAll(captor.capture());
        assertEquals(1, captor.getValue().getPageSize());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getRank_returnsRedisRankWhenAvailable() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .username("eve")
                .total_xp(90)
                .build();

        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        doAnswer(invocation -> {
            Runnable action = invocation.getArgument(1);
            action.run();
            return null;
        }).when(redisExecutor).run(any(), any());

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(zsetOps.add(KEY, learnerId.toString(), 90.0)).thenReturn(true);
        when(zsetOps.reverseRank(KEY, learnerId.toString())).thenReturn(4L);
        when(redisExecutor.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<LeaderboardMeResponse> supplier = invocation.getArgument(1);
            return supplier.get();
        });

        LeaderboardMeResponse me = leaderboardService.getRank(learnerId);

        assertEquals(learnerId, me.learnerId());
        assertEquals(5L, me.rank());
        assertEquals(90, me.totalXp());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getRank_usesDatabaseFallbackWhenRedisUnavailable() throws ResourceNotFoundException {
        UUID learnerId = UUID.randomUUID();
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .username("eve")
                .total_xp(-5)
                .build();

        UUID otherLearnerId = UUID.randomUUID();
        Learner otherLearner = Learner.builder()
                .learnerId(otherLearnerId)
                .username("alice")
                .total_xp(50)
                .build();

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(learnerRepository.findAll(any(org.springframework.data.domain.Sort.class))).thenReturn(
                List.of(otherLearner, learner)
        );
        when(redisExecutor.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<LeaderboardMeResponse> fallback = invocation.getArgument(2);
            return fallback.get();
        });

        LeaderboardMeResponse me = leaderboardService.getRank(learnerId);

        assertEquals(learnerId, me.learnerId());
        assertEquals(2L, me.rank());
        assertEquals(0, me.totalXp());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getRank_throwsWhenNoRankInAnySource() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = Learner.builder().learnerId(learnerId).username("nobody").total_xp(0).build();

        when(learnerRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(redisExecutor.execute(any(), any(), any())).thenReturn(null);

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> leaderboardService.getRank(learnerId));

        assertEquals("Leaderboard not found with learnerId: " + learnerId, ex.getMessage());
    }

    @SuppressWarnings("unchecked")
    @Test
    void getRank_throwsWhenLearnerMissing() {
        UUID learnerId = UUID.randomUUID();
        when(learnerRepository.findById(learnerId)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> leaderboardService.getRank(learnerId));

        assertEquals("Learner not found with id: " + learnerId, ex.getMessage());
        verify(redisExecutor, never()).execute(any(), any(), any());
    }

    @Test
    void rebuildFromDatabase_rebuildsRedisIndexAcrossPages() {
        UUID learnerA = UUID.randomUUID();
        UUID learnerB = UUID.randomUUID();
        Learner first = Learner.builder().learnerId(learnerA).total_xp(20).build();
        Learner second = Learner.builder().learnerId(learnerB).total_xp(-3).build();
        Page<Learner> firstPage = new PageImpl<>(List.of(first), PageRequest.of(0, 500), 501);
        Page<Learner> secondPage = new PageImpl<>(List.of(second), PageRequest.of(1, 500), 501);

        when(redisTemplate.opsForZSet()).thenReturn(zsetOps);
        when(learnerRepository.findAll(any(PageRequest.class))).thenReturn(firstPage, secondPage);
        doAnswer(invocation -> {
            Runnable action = invocation.getArgument(1);
            action.run();
            return null;
        }).when(redisExecutor).run(any(), any());

        leaderboardService.rebuildFromDatabase();

        verify(redisTemplate).delete(KEY);
        verify(zsetOps).add(KEY, learnerA.toString(), 20.0);
        verify(zsetOps).add(KEY, learnerB.toString(), 0.0);

        ArgumentCaptor<PageRequest> captor = ArgumentCaptor.forClass(PageRequest.class);
        verify(learnerRepository, times(2)).findAll(captor.capture());
        assertEquals(0, captor.getAllValues().get(0).getPageNumber());
        assertEquals(1, captor.getAllValues().get(1).getPageNumber());
    }
}
