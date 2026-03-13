package com.smu.csd.quiz.question_bank;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BankQuestionOptionRepository extends JpaRepository<BankQuestionOption, UUID> {
    List<BankQuestionOption> findByBankQuestion_BankQuestionId(UUID bankQuestionId);
    void deleteByBankQuestion_BankQuestionId(UUID bankQuestionId);
}
