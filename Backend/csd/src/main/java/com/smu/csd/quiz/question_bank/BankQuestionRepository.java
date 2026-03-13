package com.smu.csd.quiz.question_bank;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BankQuestionRepository extends JpaRepository<BankQuestion, UUID> {
    List<BankQuestion> findByMap_MapId(UUID mapId);
    List<BankQuestion> findByStatus(BankQuestion.Status status);
    List<BankQuestion> findByMap_MapIdAndStatus(UUID mapId, BankQuestion.Status status);
}
