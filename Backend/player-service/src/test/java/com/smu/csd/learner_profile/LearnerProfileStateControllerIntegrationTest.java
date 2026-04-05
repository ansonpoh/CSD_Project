package com.smu.csd.learner_profile;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
public class LearnerProfileStateControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LearnerProfileStateService learnerProfileStateService;

    @Test
    void getProfileState_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/learner/me/profile-state"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfileState_WithJwt_ReturnsProfileState() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        LearnerProfileStateResponse response = new LearnerProfileStateResponse(
                "warrior",
                new LearnerProfileStateResponse.DailyQuestState(
                        "2026-04-01",
                        2,
                        "2026-03-31",
                        false,
                        5,
                        "2026-03-31",
                        List.of()
                )
        );

        when(learnerProfileStateService.getProfileState(supabaseUserId)).thenReturn(response);

        mockMvc.perform(get("/api/learner/me/profile-state")
                        .with(jwt().jwt(jwt -> jwt.subject(supabaseUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarPreset").value("warrior"))
                .andExpect(jsonPath("$.dailyQuests.streak").value(2));
    }
}
