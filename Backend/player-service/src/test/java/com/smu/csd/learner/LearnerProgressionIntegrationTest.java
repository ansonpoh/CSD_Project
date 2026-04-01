package com.smu.csd.learner;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class LearnerProgressionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createLearnerThenAwardXp_UpdatesLeaderboardAndRank() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();

        Learner createRequest = Learner.builder()
                .supabaseUserId(supabaseUserId)
                .username("progress_player")
                .email("progress_player@example.com")
                .full_name("Progress Player")
                .build();

        mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.supabaseUserId").value(supabaseUserId.toString()))
                .andExpect(jsonPath("$.total_xp").value(0))
                .andExpect(jsonPath("$.level").value(1));

        LearnerController.AwardXpRequest awardRequest = new LearnerController.AwardXpRequest(225, 40);

        mockMvc.perform(post("/api/learner/me/award-xp")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(awardRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_xp").value(225))
                .andExpect(jsonPath("$.gold").value(40))
                .andExpect(jsonPath("$.level").value(2));

        mockMvc.perform(get("/api/leaderboard")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString())))
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("progress_player"))
                .andExpect(jsonPath("$[0].totalXp").value(225))
                .andExpect(jsonPath("$[0].rank").value(1));

        mockMvc.perform(get("/api/leaderboard/me")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("progress_player"))
                .andExpect(jsonPath("$.totalXp").value(225))
                .andExpect(jsonPath("$.rank").value(1));
    }

    @Test
    void updateLearner_PartialUpdateKeepsUnspecifiedFieldsIntact() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();

        Learner createRequest = Learner.builder()
                .supabaseUserId(supabaseUserId)
                .username("partial_update_player")
                .email("partial_update_player@example.com")
                .full_name("Original Full Name")
                .build();

        String createResponseBody = mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID learnerId = UUID.fromString(objectMapper.readTree(createResponseBody).get("learnerId").asText());

        LearnerController.AwardXpRequest awardRequest = new LearnerController.AwardXpRequest(400, 25);
        mockMvc.perform(post("/api/learner/me/award-xp")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(awardRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_xp").value(400))
                .andExpect(jsonPath("$.gold").value(25));

        Learner partialUpdate = Learner.builder()
                .username("renamed_player")
                .build();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/learner/{id}", learnerId)
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("renamed_player"))
                .andExpect(jsonPath("$.full_name").value("Original Full Name"))
                .andExpect(jsonPath("$.total_xp").value(400))
                .andExpect(jsonPath("$.gold").value(25));
    }

}
