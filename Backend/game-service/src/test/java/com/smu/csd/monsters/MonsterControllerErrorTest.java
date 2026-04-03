package com.smu.csd.monsters;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class MonsterControllerErrorTest {

    private MonsterController controller;
    private MonsterService service;

    @BeforeEach
    public void setUp() {
        service = mock(MonsterService.class);
        controller = new MonsterController(service);
    }

    @Test
    public void testGetMonsterById_NotFound() {
        UUID monsterId = UUID.randomUUID();
        when(service.getMonsterById(monsterId)).thenThrow(new RuntimeException("Monster not found"));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
            controller.getMonsterById(monsterId)
        );
        assertEquals("Monster not found", exception.getMessage());
    }

    @Test
    public void testUpdateMonster_NotFound() {
        UUID monsterId = UUID.randomUUID();
        Monster monster = new Monster();
        when(service.updateMonster(eq(monsterId), any(Monster.class)))
                .thenThrow(new RuntimeException("Monster not found"));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
            controller.updateMonster(monsterId, monster)
        );
        assertEquals("Monster not found", exception.getMessage());
    }

    @Test
    public void testDeleteMonster_NotFound() {
        UUID monsterId = UUID.randomUUID();
        doThrow(new RuntimeException("Monster not found")).when(service).deleteMonster(monsterId);

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
            controller.deleteMonster(monsterId)
        );
        assertEquals("Monster not found", exception.getMessage());
    }
}
