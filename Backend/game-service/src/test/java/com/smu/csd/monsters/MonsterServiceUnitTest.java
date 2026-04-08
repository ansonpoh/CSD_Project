package com.smu.csd.monsters;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.smu.csd.monsters.monster_map.MonsterMap;
import com.smu.csd.monsters.monster_map.MonsterMapRepository;
import com.smu.csd.exception.ResourceNotFoundException;
import com.smu.csd.maps.MapRepository;
import com.smu.csd.monsters.monster_map.MonsterMapAssignRequest;

public class MonsterServiceUnitTest {

    private MonsterService service;
    private MonsterRepository repository;
    private MonsterMapRepository monsterMapRepository;
    private MapRepository mapRepository;

    @BeforeEach
    public void setUp() {
        repository = mock(MonsterRepository.class);
        monsterMapRepository = mock(MonsterMapRepository.class);
        mapRepository = mock(MapRepository.class);
        service = new MonsterService(repository, monsterMapRepository, mapRepository);
        ReflectionTestUtils.setField(service, "minMonstersPerMap", 1);
        ReflectionTestUtils.setField(service, "maxMonstersPerMap", 2);
    }

    @Test
    public void testGetAllMonsters() {
        List<Monster> monsters = Arrays.asList(new Monster(), new Monster());
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(monsters));

        List<Monster> result = service.getAllMonsters();

        assertEquals(2, result.size());
        verify(repository).findAll(any(Pageable.class));
    }

    @Test
    public void testGetMonsterByIdSuccess() {
        UUID monsterId = UUID.randomUUID();
        Monster monster = new Monster();
        monster.setMonsterId(monsterId);
        monster.setName("Test Monster");

        when(repository.findById(monsterId)).thenReturn(java.util.Optional.of(monster));

        Monster result = service.getMonsterById(monsterId);

        assertNotNull(result);
        assertEquals(monsterId, result.getMonsterId());
        assertEquals("Test Monster", result.getName());
    }

    @Test
    public void testGetMonsterByIdNotFound() {
        UUID monsterId = UUID.randomUUID();
        when(repository.findById(monsterId)).thenReturn(java.util.Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () ->
            service.getMonsterById(monsterId)
        );
        assertTrue(exception.getMessage().contains("Monster not found with id: " + monsterId));
    }

    @Test
    public void testGetMonstersByMapId() {
        UUID mapId = UUID.randomUUID();
        Monster monster1 = new Monster();
        monster1.setMonsterId(UUID.randomUUID());
        Monster monster2 = new Monster();
        monster2.setMonsterId(UUID.randomUUID());

        MonsterMap map1 = new MonsterMap();
        map1.setMonster(monster1);
        MonsterMap map2 = new MonsterMap();
        map2.setMonster(monster2);

        when(monsterMapRepository.findAllByMapMapId(mapId)).thenReturn(Arrays.asList(map1, map2));

        List<Monster> result = service.getMonstersByMapId(mapId);

        assertEquals(2, result.size());
    }

    @Test
    public void testSaveMonster() {
        Monster monster = new Monster();
        monster.setName("New Monster");
        when(repository.save(monster)).thenReturn(monster);

        Monster result = service.saveMonster(monster);

        assertNotNull(result);
        assertEquals("New Monster", result.getName());
        verify(repository).save(monster);
    }

    @Test
    public void testUpdateMonsterSuccess() {
        UUID monsterId = UUID.randomUUID();
        Monster existing = new Monster();
        existing.setMonsterId(monsterId);
        existing.setName("Old Name");

        Monster update = new Monster();
        update.setName("New Name");
        update.setDescription("New description");

        when(repository.findById(monsterId)).thenReturn(java.util.Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        Monster result = service.updateMonster(monsterId, update);

        assertEquals("New Name", result.getName());
        assertEquals("New description", result.getDescription());
        verify(repository).save(existing);
    }

    @Test
    public void testUpdateMonsterNotFound() {
        UUID monsterId = UUID.randomUUID();
        Monster update = new Monster();
        when(repository.findById(monsterId)).thenReturn(java.util.Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () ->
            service.updateMonster(monsterId, update)
        );
        assertTrue(exception.getMessage().contains("Monster not found with id: " + monsterId));
    }

    @Test
    public void testDeleteMonster() {
        UUID monsterId = UUID.randomUUID();
        when(repository.existsById(monsterId)).thenReturn(true);
        doNothing().when(repository).deleteById(monsterId);

        service.deleteMonster(monsterId);

        verify(repository).existsById(monsterId);
        verify(repository).deleteById(monsterId);
    }

    @Test
    public void testAssignMonstersToMap_RejectsOutOfRangeCount() {
        UUID mapId = UUID.randomUUID();
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.assignMonstersToMap(new MonsterMapAssignRequest(mapId, List.of()))
        );
        assertTrue(exception.getMessage().contains("between 1 and 2 monsters"));
    }

    @Test
    public void testAssignMonstersToMap_Success() {
        UUID mapId = UUID.randomUUID();
        UUID firstMonsterId = UUID.randomUUID();
        UUID secondMonsterId = UUID.randomUUID();

        com.smu.csd.maps.Map map = new com.smu.csd.maps.Map();
        map.setMapId(mapId);
        map.setPublished(true);
        map.setStatus(com.smu.csd.maps.Map.Status.APPROVED);

        Monster firstMonster = new Monster();
        firstMonster.setMonsterId(firstMonsterId);
        firstMonster.setName("First");

        Monster secondMonster = new Monster();
        secondMonster.setMonsterId(secondMonsterId);
        secondMonster.setName("Second");

        when(mapRepository.findById(mapId)).thenReturn(java.util.Optional.of(map));
        when(repository.findById(firstMonsterId)).thenReturn(java.util.Optional.of(firstMonster));
        when(repository.findById(secondMonsterId)).thenReturn(java.util.Optional.of(secondMonster));

        MonsterMap existingFirst = new MonsterMap();
        existingFirst.setMonster(firstMonster);
        MonsterMap existingSecond = new MonsterMap();
        existingSecond.setMonster(secondMonster);
        when(monsterMapRepository.findAllByMapMapId(mapId)).thenReturn(List.of(existingFirst, existingSecond));

        List<Monster> result = service.assignMonstersToMap(
            new MonsterMapAssignRequest(mapId, List.of(firstMonsterId, secondMonsterId))
        );

        assertEquals(2, result.size());
        verify(monsterMapRepository).deleteAllByMapMapId(mapId);
        verify(monsterMapRepository, times(2)).save(any(MonsterMap.class));
    }
}
