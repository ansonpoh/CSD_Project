package com.smu.csd.monsters;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;




@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/monsters")
public class MonsterController {
    private final MonsterService service;

    public MonsterController(MonsterService service) {
        this.service = service;
    }

    @GetMapping("/{monster_id}")
    public Monster getMonsterById(@PathVariable UUID monster_id) {
        return service.getMonsterById(monster_id);
    }

    @GetMapping("/all")
    public List<Monster> getAllMonsters() {
        return service.getAllMonsters();
    }

    @GetMapping("/map/{map_id}")
    public List<Monster> getMonstersByMap(@PathVariable UUID map_id) {
        return service.getMonstersByMapId(map_id);
    }
    
    

    @PostMapping("/add")
    public Monster addMonster(@Valid @RequestBody Monster monster) {
        return service.saveMonster(monster);
    }

    @PutMapping("/{monster_id}")
    public Monster updateMonster(@PathVariable UUID monster_id, @Valid @RequestBody Monster monster) {
        return service.updateMonster(monster_id, monster);
    }

    @DeleteMapping("/{monster_id}")
    public void deleteMonster(@PathVariable UUID monster_id) {
        service.deleteMonster(monster_id);
    }
    
    
}
