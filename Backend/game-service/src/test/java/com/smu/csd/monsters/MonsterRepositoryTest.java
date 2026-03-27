package com.smu.csd.monsters;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class MonsterRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MonsterRepository monsterRepository;

    @Test
    void connectionEstablished() {
        assertThat(postgres.isCreated()).isTrue();
        assertThat(postgres.isRunning()).isTrue();
    }

    @Test
    void shouldSaveAndFindMonster() {
        Monster monster = Monster.builder()
                .name("Goblin")
                .description("A small green creature")
                .asset("goblin.png")
                .build();

        Monster saved = monsterRepository.save(monster);

        assertThat(saved.getMonsterId()).isNotNull();
        
        Optional<Monster> found = monsterRepository.findById(saved.getMonsterId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Goblin");
    }

    @Test
    void shouldDeleteMonster() {
        Monster monster = Monster.builder()
                .name("Orc")
                .description("A large green warrior")
                .build();
        Monster saved = monsterRepository.save(monster);
        UUID id = saved.getMonsterId();

        monsterRepository.deleteById(id);

        assertThat(monsterRepository.findById(id)).isEmpty();
    }
}
