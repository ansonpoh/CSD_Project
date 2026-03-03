package com.smu.csd.quiz;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/quizzes")
public class QuizController {
    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping("/monster-encounter")
    public MonsterEncounterQuizResponse generateMonsterEncounterQuiz(@RequestBody MonsterEncounterQuizRequest request) {
        return quizService.generateMonsterEncounterQuiz(request);
    }
}
