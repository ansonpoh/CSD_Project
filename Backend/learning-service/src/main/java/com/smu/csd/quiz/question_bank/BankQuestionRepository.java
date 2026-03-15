package com.smu.csd.quiz.question_bank;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BankQuestionRepository extends JpaRepository<BankQuestion, UUID> {
    List<BankQuestion> findByMapId(UUID mapId);
    List<BankQuestion> findByStatus(BankQuestion.Status status);
    List<BankQuestion> findByMapIdAndStatus(UUID mapId, BankQuestion.Status status);
}
