package com.smu.csd.quiz.map_quiz;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.TestAiConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestAiConfig.class)
public class MapQuizControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MapQuizService mapQuizService;

    @Test
    void createQuiz_WithJwt_ReturnsCreatedQuiz() throws Exception {
        UUID mapId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();

        MapQuizCreateRequest request = new MapQuizCreateRequest(mapId, "Unit Test Quiz", "Quiz description");
        MapQuizResponse response = new MapQuizResponse(quizId, mapId, "Unit Test Quiz", "Quiz description", false, List.of());

        when(mapQuizService.createQuiz(any(MapQuizCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/map-quizzes")
                        .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quizId").value(quizId.toString()))
                .andExpect(jsonPath("$.mapId").value(mapId.toString()))
                .andExpect(jsonPath("$.title").value("Unit Test Quiz"));
    }

    @Test
    void getQuizForLearner_WithoutJwt_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/map-quizzes/map/{mapId}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }
}
