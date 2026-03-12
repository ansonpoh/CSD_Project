package com.smu.csd.quiz.question_bank;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/question-bank")
public class QuestionBankController {

    private final QuestionBankService questionBankService;

    public QuestionBankController(QuestionBankService questionBankService) {
        this.questionBankService = questionBankService;
    }

    // --- Content summary (admin reads before generating) ---

    @GetMapping("/map/{mapId}/content-summary")
    public List<MapContentSummaryResponse> getContentSummary(@PathVariable UUID mapId) {
        return questionBankService.getContentSummary(mapId);
    }

    // --- AI generation (returns draft, does not save) ---

    @PostMapping("/map/{mapId}/generate")
    public List<BankQuestionRequest> generateDraft(@PathVariable UUID mapId) {
        return questionBankService.generateDraft(mapId);
    }

    // --- Save admin-finalized questions to bank ---

    @PostMapping("/map/{mapId}")
    public List<BankQuestionResponse> saveQuestions(
        @PathVariable UUID mapId,
        @RequestBody List<BankQuestionRequest> requests
    ) {
        return questionBankService.saveQuestions(mapId, requests);
    }

    // --- Read ---

    @GetMapping("/all")
    public List<BankQuestionResponse> getAllBankQuestions() {
        return questionBankService.getAllBankQuestions();
    }

    @GetMapping("/map/{mapId}")
    public List<BankQuestionResponse> getBankQuestionsByMap(@PathVariable UUID mapId) {
        return questionBankService.getBankQuestionsByMap(mapId);
    }

    // --- Edit ---

    @PutMapping("/{bankQuestionId}")
    public BankQuestionResponse updateQuestion(
        @PathVariable UUID bankQuestionId,
        @RequestBody BankQuestionRequest request
    ) {
        return questionBankService.updateQuestion(bankQuestionId, request);
    }

    // --- Approve / Reject ---

    @PutMapping("/{bankQuestionId}/approve")
    public BankQuestionResponse approveQuestion(@PathVariable UUID bankQuestionId) {
        return questionBankService.approveQuestion(bankQuestionId);
    }

    @PutMapping("/{bankQuestionId}/reject")
    public BankQuestionResponse rejectQuestion(@PathVariable UUID bankQuestionId) {
        return questionBankService.rejectQuestion(bankQuestionId);
    }

    // --- Copy into quiz ---

    @PostMapping("/into-quiz/{quizId}/{bankQuestionId}")
    public void addBankQuestionToQuiz(
        @PathVariable UUID quizId,
        @PathVariable UUID bankQuestionId
    ) {
        questionBankService.addBankQuestionToQuiz(quizId, bankQuestionId);
    }
}
