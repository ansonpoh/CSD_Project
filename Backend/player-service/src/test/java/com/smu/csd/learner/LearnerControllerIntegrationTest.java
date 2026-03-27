package com.smu.csd.learner;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public class LearnerControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LearnerService learnerService;

    private Learner sampleLearner;
    private UUID learnerId;

    @BeforeEach
    void setUp() {
        learnerId = UUID.randomUUID();
        sampleLearner = Learner.builder()
                .learnerId(learnerId)
                .username("testuser")
                .email("test@example.com")
                .full_name("Test User")
                .total_xp(100)
                .level(1)
                .gold(50)
                .is_active(true)
                .build();
    }

    @Test
    @WithMockUser
    void getAllLearners_ShouldReturnList() throws Exception {
        when(learnerService.getAllLearners()).thenReturn(Collections.singletonList(sampleLearner));

        mockMvc.perform(get("/api/learner/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("testuser"));
    }

    @Test
    @WithMockUser
    void getLearnerById_WhenExists_ShouldReturnLearner() throws Exception {
        when(learnerService.getById(learnerId)).thenReturn(sampleLearner);

        mockMvc.perform(get("/api/learner/" + learnerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @WithMockUser
    void addLearner_WithValidData_ShouldReturnCreated() throws Exception {
        when(learnerService.createLearner(any(), any(), any(), any())).thenReturn(sampleLearner);

        mockMvc.perform(post("/api/learner/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sampleLearner)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @WithMockUser
    void addLearner_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        Learner invalidLearner = new Learner(); // Missing required fields

        mockMvc.perform(post("/api/learner/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidLearner)))
                .andExpect(status().isBadRequest());
    }
}
