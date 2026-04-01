package com.smu.csd.monsters;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.exception.ResourceNotFoundException;

@SpringBootTest
@AutoConfigureMockMvc
public class MonsterControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MonsterService monsterService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser
    void shouldReturnMonsterById() throws Exception {
        UUID id = UUID.randomUUID();
        Monster monster = Monster.builder()
                .monsterId(id)
                .name("Slime")
                .build();

        when(monsterService.getMonsterById(id)).thenReturn(monster);

        mockMvc.perform(get("/api/monsters/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Slime"));
    }

    @Test
    @WithMockUser
    void shouldReturn404WhenMonsterNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        when(monsterService.getMonsterById(id)).thenThrow(new ResourceNotFoundException("Monster", "id", id));

        mockMvc.perform(get("/api/monsters/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void shouldReturn400WhenMonsterNameIsBlank() throws Exception {
        Monster invalidMonster = Monster.builder()
                .name("") // Blank name
                .build();

        mockMvc.perform(post("/api/monsters/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidMonster)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void shouldUpdateMonster() throws Exception {
        UUID id = UUID.randomUUID();
        Monster monster = Monster.builder()
                .name("Updated Slime")
                .build();

        when(monsterService.updateMonster(eq(id), any(Monster.class))).thenReturn(monster);

        mockMvc.perform(put("/api/monsters/{id}", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(monster)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Slime"));
    }

    @Test
    void shouldRequireAuthenticationForProtectedMonsterEndpoint() throws Exception {
        mockMvc.perform(get("/api/monsters/all"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void shouldReturnBadRequestForInvalidUuidPath() throws Exception {
        mockMvc.perform(get("/api/monsters/{id}", "not-a-uuid"))
                .andExpect(status().isBadRequest());
    }
}
