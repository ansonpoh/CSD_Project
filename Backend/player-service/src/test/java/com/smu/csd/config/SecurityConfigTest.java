package com.smu.csd.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void publicEndpoint_Health_IsAccessible() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    public void publicEndpoint_Swagger_IsAccessible() throws Exception {
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().isOk());
    }

    @Test
    public void protectedEndpoint_Players_RequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/learner"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    public void protectedEndpoint_Players_WithAuth_IsAccessible() throws Exception {
        mockMvc.perform(get("/api/learner"))
                .andExpect(status().isOk());
    }
}
