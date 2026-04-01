package com.smu.csd.auth;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import com.smu.csd.roles.administrator.AdministratorRepository;
import com.smu.csd.roles.contributor.ContributorRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthRoleControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdministratorRepository administratorRepository;

    @MockBean
    private ContributorRepository contributorRepository;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    void myRole_ReturnsAdminWhenAdminProfileExists() throws Exception {
        UUID userId = UUID.randomUUID();
        when(administratorRepository.existsBySupabaseUserIdAndIsActiveTrue(userId)).thenReturn(true);

        mockMvc.perform(get("/api/auth/role/me")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("admin"))
                .andExpect(jsonPath("$.supabaseUserId").value(userId.toString()));
    }

    @Test
    void myRole_ReturnsUnauthorizedWithoutJwtPrincipal() throws Exception {
        mockMvc.perform(get("/api/auth/role/me"))
                .andExpect(status().isUnauthorized());
    }
}
