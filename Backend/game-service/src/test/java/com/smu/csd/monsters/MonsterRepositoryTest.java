package com.smu.csd.monsters;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
public class MonsterRepositoryTest {

    @Autowired
    private MonsterRepository monsterRepository;

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
