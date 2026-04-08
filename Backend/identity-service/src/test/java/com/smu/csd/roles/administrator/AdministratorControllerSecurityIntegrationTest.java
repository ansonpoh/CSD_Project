package com.smu.csd.roles.administrator;

import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyInt;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
public class AdministratorControllerSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdministratorService administratorService;

    @Test
    void getAllAdministrators_WithoutAuthentication_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/administrators/all"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CONTRIBUTOR")
    void getAllAdministrators_WithNonAdminRole_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/administrators/all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllAdministrators_WithAdminRole_ReturnsOk() throws Exception {
        Administrator administrator = Administrator.builder()
                .administratorId(UUID.randomUUID())
                .supabaseUserId(UUID.randomUUID())
                .email("admin@example.com")
                .fullName("Admin User")
                .isActive(true)
                .build();

        when(administratorService.getAllAdministrators(anyInt(), anyInt())).thenReturn(List.of(administrator));

        mockMvc.perform(get("/api/administrators/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("admin@example.com"));
    }
}
