package com.smu.csd.learner;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    void getAllLearners_ShouldReturnList() throws Exception {
        when(learnerService.getAllLearners(anyInt(), anyInt())).thenReturn(Collections.singletonList(sampleLearner));

        mockMvc.perform(get("/api/learner/all")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("testuser"));
    }

    @Test
    void getLearnerById_WhenExists_ShouldReturnLearner() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        sampleLearner.setSupabaseUserId(supabaseUserId);
        when(learnerService.getById(learnerId)).thenReturn(sampleLearner);
        when(learnerService.getBySupabaseUserId(supabaseUserId)).thenReturn(sampleLearner);

        mockMvc.perform(get("/api/learner/" + learnerId)
                        .with(jwt().jwt(token -> token.subject(supabaseUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void getLearnerById_WhenDifferentLearner_ShouldReturnForbidden() throws Exception {
        UUID requesterSupabaseUserId = UUID.randomUUID();
        UUID ownerSupabaseUserId = UUID.randomUUID();
        sampleLearner.setSupabaseUserId(ownerSupabaseUserId);
        when(learnerService.getBySupabaseUserId(requesterSupabaseUserId)).thenReturn(
                Learner.builder().learnerId(UUID.randomUUID()).supabaseUserId(requesterSupabaseUserId).is_active(true).build()
        );

        mockMvc.perform(get("/api/learner/" + learnerId)
                        .with(jwt().jwt(token -> token.subject(requesterSupabaseUserId.toString()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void getLearnerById_WhenAdmin_ShouldBypassOwnership() throws Exception {
        UUID adminSupabaseUserId = UUID.randomUUID();
        when(learnerService.getById(learnerId)).thenReturn(sampleLearner);

        mockMvc.perform(get("/api/learner/" + learnerId)
                        .with(jwt().jwt(token -> token.subject(adminSupabaseUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void addLearner_WithValidData_ShouldReturnCreated() throws Exception {
        UUID supabaseUserId = UUID.randomUUID();
        sampleLearner.setSupabaseUserId(supabaseUserId);
        when(learnerService.createLearner(any(), any(), any(), any())).thenReturn(sampleLearner);

        mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(token -> token.subject(supabaseUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleLearner)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void addLearner_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        Learner invalidLearner = new Learner();

        mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidLearner)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addLearner_WithMalformedJson_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"supabaseUserId\":\"not-closed\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Malformed JSON request"));
    }

    @Test
    void getLearnerById_WithInvalidUuid_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(get("/api/learner/{learner_id}", "not-a-uuid")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Invalid value")));
    }

    @Test
    void addLearner_WithInvalidEmailFormat_ShouldReturnBadRequest() throws Exception {
        Learner invalidEmailLearner = Learner.builder()
                .supabaseUserId(UUID.randomUUID())
                .username("invalid_email_player")
                .email("not-an-email")
                .full_name("Invalid Email")
                .build();

        mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidEmailLearner)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addLearner_WithMissingFullName_ShouldReturnBadRequest() throws Exception {
        Learner missingFullNameLearner = Learner.builder()
                .supabaseUserId(UUID.randomUUID())
                .username("missing_full_name_player")
                .email("missing_full_name_player@example.com")
                .full_name(" ")
                .build();

        mockMvc.perform(post("/api/learner/add")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingFullNameLearner)))
                .andExpect(status().isBadRequest());
    }
}
