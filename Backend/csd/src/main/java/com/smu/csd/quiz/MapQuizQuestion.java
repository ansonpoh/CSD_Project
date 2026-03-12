package com.smu.csd.quiz;

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
@Table(schema = "quiz", name = "map_quiz_question")
public class MapQuizQuestion {

    @Id
    @UuidGenerator
    @Column(name = "question_id")
    private UUID questionId;

    @ManyToOne
    @JoinColumn(name = "quiz_id", nullable = false)
    private MapQuiz quiz;

    @Column(name = "scenario_text", nullable = false, columnDefinition = "text")
    private String scenarioText;

    @Column(name = "question_order", nullable = false)
    private int questionOrder;
}
