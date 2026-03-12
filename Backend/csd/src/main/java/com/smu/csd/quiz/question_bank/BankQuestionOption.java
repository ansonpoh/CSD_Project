package com.smu.csd.quiz.question_bank;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(schema = "quiz", name = "map_question_bank_option")
public class BankQuestionOption {

    @Id
    @UuidGenerator
    @Column(name = "bank_option_id")
    private UUID bankOptionId;

    @ManyToOne
    @JoinColumn(name = "bank_question_id", nullable = false)
    private BankQuestion bankQuestion;

    @Column(name = "option_text", nullable = false, columnDefinition = "text")
    private String optionText;

    @Column(name = "is_correct", nullable = false)
    private boolean isCorrect;
}
