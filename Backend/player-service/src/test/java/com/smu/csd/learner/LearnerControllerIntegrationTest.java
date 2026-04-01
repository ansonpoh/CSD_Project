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
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class LearnerControllerIntegrationTest {

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

    @Test
    @WithMockUser
    void addLearner_WithMalformedJson_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/learner/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"supabaseUserId\":\"not-closed\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Malformed JSON request"));
    }

    @Test
    @WithMockUser
    void getLearnerById_WithInvalidUuid_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(get("/api/learner/{learner_id}", "not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Invalid value")));
    }
}
