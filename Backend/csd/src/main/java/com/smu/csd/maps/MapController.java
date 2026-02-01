package com.smu.csd.maps;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping("/{world_id}")
    public String getMethodName(@RequestParam String param) {
        return new String();
    }
    

    
    @PostMapping("/add")
    public Map addMap(@RequestBody Map map) {
        return service.saveMap(map);
    }
    
    
    
}
