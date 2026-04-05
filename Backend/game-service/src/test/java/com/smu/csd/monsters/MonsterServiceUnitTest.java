package com.smu.csd.monsters;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smu.csd.monsters.monster_map.MonsterMap;
import com.smu.csd.monsters.monster_map.MonsterMapRepository;
import com.smu.csd.exception.ResourceNotFoundException;

public class MonsterServiceUnitTest {

    private MonsterService service;
    private MonsterRepository repository;
    private MonsterMapRepository monsterMapRepository;

    @BeforeEach
    public void setUp() {
        repository = mock(MonsterRepository.class);
        monsterMapRepository = mock(MonsterMapRepository.class);
        service = new MonsterService(repository, monsterMapRepository);
    }

    @Test
    public void testGetAllMonsters() {
        List<Monster> monsters = Arrays.asList(new Monster(), new Monster());
        when(repository.findAll()).thenReturn(monsters);

        List<Monster> result = service.getAllMonsters();

        assertEquals(2, result.size());
        verify(repository).findAll();
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
}
