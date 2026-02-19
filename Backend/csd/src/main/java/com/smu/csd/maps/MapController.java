package com.smu.csd.maps;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;



@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/maps")
public class MapController {
    private final MapService service;

    public MapController(MapService service) {
        this.service = service;
    }

    @GetMapping("/{map_id}")
    public Optional<Map> getMapById(@PathVariable UUID map_id) {
        return service.getMapById(map_id);
    }

    @GetMapping("/all")
    public List<Map> getAllMaps() {
        return service.getAllMaps();
    }

    @GetMapping("/world/{world_id}")
    public List<Map> getMapsByWorldId(@PathVariable("world_id") UUID world_id) {
        return service.getMapsByWorldId(world_id);
    }
    

    
    @PostMapping("/add")
    public Map addMap(@RequestBody Map map) {
        return service.saveMap(map);
    }
    
    
    
}
