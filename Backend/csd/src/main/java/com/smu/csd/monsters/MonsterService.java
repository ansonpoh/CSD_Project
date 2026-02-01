package com.smu.csd.monsters;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class MonsterService {
    private final MonsterRepository repository;

    public MonsterService(MonsterRepository repository) {
        this.repository = repository;
    }

    //Get Requests
    public List<Monster> getAllMonsters() {
        return repository.findAll();
    }

    public Optional<Monster> getMonsterById(UUID monster_id) {
        return repository.findById(monster_id);
    }

    //Post Requests
    public Monster saveMonster(Monster monster) {
        return repository.save(monster);
    }
}
