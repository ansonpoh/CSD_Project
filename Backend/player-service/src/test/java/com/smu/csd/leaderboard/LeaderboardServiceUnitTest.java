package com.smu.csd.leaderboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyDouble;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;

import com.smu.csd.learner.Learner;
import com.smu.csd.learner.LearnerRepository;
import com.smu.csd.redis.RedisExecutor;

public class LeaderboardServiceUnitTest {

    private StringRedisTemplate redisTemplate;
    private LearnerRepository learnerRepository;
    private RedisExecutor redisExecutor;
    private LeaderboardService leaderboardService;

    @SuppressWarnings("unchecked")
    private ZSetOperations<String, String> zSetOperations = mock(ZSetOperations.class);

    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        learnerRepository = mock(LearnerRepository.class);
        redisExecutor = new RedisExecutor();
        leaderboardService = new LeaderboardService(redisTemplate, learnerRepository, redisExecutor);

        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
    }

    @Test
    void getTop_ReturnsDatabaseOrderedEntriesWhenRedisHasNoData() {
        Learner alice = Learner.builder()
                .learnerId(UUID.randomUUID())
                .username("alice")
                .total_xp(150)
                .is_active(true)
                .build();
        Learner bob = Learner.builder()
                .learnerId(UUID.randomUUID())
                .username("bob")
                .total_xp(90)
                .is_active(true)
                .build();

        Page<Learner> page = new PageImpl<>(List.of(alice, bob));
        when(zSetOperations.reverseRangeWithScores(any(), anyLong(), anyLong()))
                .thenThrow(new RuntimeException("Redis unavailable"));
        when(learnerRepository.findByIs_activeTrue(any(org.springframework.data.domain.Pageable.class))).thenReturn(page);

        List<LeaderboardEntryResponse> top = leaderboardService.getTop(10);

        assertEquals(2, top.size());
        assertEquals("alice", top.get(0).username());
        assertEquals(1L, top.get(0).rank());
        assertEquals("bob", top.get(1).username());
        assertEquals(2L, top.get(1).rank());
    }

    @Test
    void upsertLearnerScore_RemovesInactiveLearnerFromLeaderboard() {
        UUID learnerId = UUID.randomUUID();
        Learner inactiveLearner = Learner.builder()
                .learnerId(learnerId)
                .is_active(false)
                .build();

        leaderboardService.upsertLearnerScore(inactiveLearner);

        verify(zSetOperations, times(1)).remove(any(), any());
    }

    @Test
    void getTop_ReturnsRedisOrderedEntriesWhenRedisHasData() {
        UUID learnerId = UUID.randomUUID();
        Learner learner = Learner.builder()
                .learnerId(learnerId)
                .username("redis_user")
                .is_active(true)
                .build();

        @SuppressWarnings("unchecked")
        ZSetOperations.TypedTuple<String> tuple = mock(ZSetOperations.TypedTuple.class);
        when(tuple.getValue()).thenReturn(learnerId.toString());
        when(tuple.getScore()).thenReturn(320.0);
        when(zSetOperations.reverseRangeWithScores(any(), anyLong(), anyLong()))
                .thenReturn(Set.of(tuple));
        when(zSetOperations.reverseRank(any(), eq(learnerId.toString()))).thenReturn(0L);
        when(learnerRepository.findAllById(any(Iterable.class))).thenReturn(List.of(learner));

        List<LeaderboardEntryResponse> top = leaderboardService.getTop(10);

        assertEquals(1, top.size());
        assertEquals("redis_user", top.getFirst().username());
        assertEquals(320, top.getFirst().totalXp());
        assertEquals(1L, top.getFirst().rank());
    }

    @Test
    void getTop_ReturnsEmptyWhenRedisIsAvailableButLeaderboardIsEmpty() {
        when(zSetOperations.reverseRangeWithScores(any(), anyLong(), anyLong())).thenReturn(Set.of());

        List<LeaderboardEntryResponse> top = leaderboardService.getTop(10);

        assertEquals(0, top.size());
        verify(learnerRepository, never()).findByIs_activeTrue(any(org.springframework.data.domain.Pageable.class));
    }

    @Test
    void rebuildFromDatabase_RebuildsRedisIndexFromActiveLearners() {
        Learner first = Learner.builder()
                .learnerId(UUID.randomUUID())
                .username("first")
                .total_xp(450)
                .is_active(true)
                .build();
        Learner second = Learner.builder()
                .learnerId(UUID.randomUUID())
                .username("second")
                .total_xp(100)
                .is_active(true)
                .build();

        Page<Learner> singlePage = new PageImpl<>(List.of(first, second), PageRequest.of(0, 500), 2);
        when(learnerRepository.findByIs_activeTrue(any(org.springframework.data.domain.Pageable.class))).thenReturn(singlePage);

        leaderboardService.rebuildFromDatabase();

        verify(redisTemplate).delete("leaderboard:xp");
        verify(zSetOperations, times(2)).add(anyString(), anyString(), anyDouble());
    }
}
