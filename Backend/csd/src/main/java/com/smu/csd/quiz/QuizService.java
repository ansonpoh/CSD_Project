package com.smu.csd.quiz;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smu.csd.contents.Content;
import com.smu.csd.monsters.MonsterRepository;
import com.smu.csd.npcs.npc_map.NPCMap;
import com.smu.csd.npcs.npc_map.NPCMapRepository;

@Service
public class QuizService {
    private static final int NORMAL_QUESTION_COUNT = 10;
    private static final int BOSS_QUESTION_COUNT = 10;
    private static final int NORMAL_PASS_PERCENT = 90;
    private static final int BOSS_PASS_PERCENT = 100;
    private static final Pattern WORD_PATTERN = Pattern.compile("[A-Za-z][A-Za-z'-]{2,}");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final Set<String> STOP_WORDS = Set.of(
        "this", "that", "with", "from", "your", "they", "them", "their", "there", "what", "when",
        "where", "which", "while", "would", "could", "about", "into", "through", "during", "after",
        "before", "because", "between", "among", "these", "those", "have", "has", "been", "were",
        "will", "just", "also", "then", "than", "over", "under", "such", "some", "more",
        "most", "many", "each", "every", "including", "lesson", "topic"
    );

    private final NPCMapRepository npcMapRepository;
    private final MonsterRepository monsterRepository;

    public QuizService(
        NPCMapRepository npcMapRepository,
        MonsterRepository monsterRepository
    ) {
        this.npcMapRepository = npcMapRepository;
        this.monsterRepository = monsterRepository;
    }

    public MonsterEncounterQuizResponse generateMonsterEncounterQuiz(MonsterEncounterQuizRequest request) {
        if (request == null || request.mapId() == null) {
            throw new IllegalArgumentException("mapId is required to generate a monster encounter quiz.");
        }

        boolean bossEncounter = Boolean.TRUE.equals(request.bossEncounter());
        int totalQuestions = bossEncounter ? BOSS_QUESTION_COUNT : NORMAL_QUESTION_COUNT;
        int requiredAccuracyPercent = bossEncounter ? BOSS_PASS_PERCENT : NORMAL_PASS_PERCENT;
        int requiredCorrectAnswers = (int) Math.ceil(totalQuestions * (requiredAccuracyPercent / 100.0));
        String difficulty = bossEncounter ? "hard" : "normal";

        String monsterName = resolveMonsterName(request.monsterId());
        List<String> lessonLines = loadLessonLines(request.mapId());
        List<EncounterQuizQuestion> questions = buildQuestions(
            lessonLines,
            totalQuestions,
            bossEncounter,
            monsterName
        );

        return new MonsterEncounterQuizResponse(
            request.mapId(),
            request.monsterId(),
            monsterName,
            bossEncounter,
            difficulty,
            requiredAccuracyPercent,
            requiredCorrectAnswers,
            totalQuestions,
            questions
        );
    }

    private String resolveMonsterName(UUID monsterId) {
        if (monsterId == null) return "monster";
        return monsterRepository.findById(monsterId)
            .map(monster -> monster.getName() == null ? "monster" : monster.getName())
            .orElse("monster");
    }

    private List<String> loadLessonLines(UUID mapId) {
        return npcMapRepository.findAllByMapMapIdAndContentStatus(mapId, Content.Status.APPROVED)
            .stream()
            .map(NPCMap::getContent)
            .filter(Objects::nonNull)
            .flatMap(content -> parseLessonLines(content.getBody()).stream())
            .map(String::trim)
            .filter(line -> line.length() >= 15)
            .distinct()
            .toList();
    }

    private List<String> parseLessonLines(String body) {
        if (body == null || body.isBlank()) return List.of();

        String trimmed = body.trim();
        if (trimmed.startsWith("[")) {
            try {
                List<String> parsed = OBJECT_MAPPER.readValue(trimmed, new TypeReference<List<String>>() {});
                return splitIntoLessonLines(String.join("\n", parsed));
            } catch (Exception ignored) {
                // Falls back to manual parsing below.
            }
        }

        return splitIntoLessonLines(trimmed);
    }

    private List<String> splitIntoLessonLines(String source) {
        if (source == null || source.isBlank()) return List.of();

        String normalized = source
            .replace("\\r\\n", "\n")
            .replace("\\n", "\n")
            .replace("\r\n", "\n")
            .replace("\r", "\n");

        List<String> rows = Arrays.stream(normalized.split("\n+"))
            .map(String::trim)
            .filter(row -> !row.isBlank())
            .toList();

        List<String> expanded = new ArrayList<>();
        for (String row : rows) {
            String[] sentenceParts = row.split("(?<=[.!?])\\s+");
            if (sentenceParts.length > 1) {
                for (String sentence : sentenceParts) {
                    String cleaned = sentence.trim();
                    if (cleaned.length() >= 15) expanded.add(cleaned);
                }
            } else {
                expanded.add(row);
            }
        }
        return expanded;
    }

    private List<EncounterQuizQuestion> buildQuestions(
        List<String> lessonLines,
        int totalQuestions,
        boolean bossEncounter,
        String monsterName
    ) {
        List<String> linePool = new ArrayList<>(lessonLines.isEmpty()
            ? fallbackLessonLines(monsterName)
            : lessonLines);

        Collections.shuffle(linePool);
        List<String> vocabulary = extractVocabulary(linePool);
        if (vocabulary.isEmpty()) {
            vocabulary = new ArrayList<>(List.of(
                "culture", "language", "community", "identity", "customs", "history", "expression"
            ));
        }

        List<EncounterQuizQuestion> questions = new ArrayList<>();
        for (int i = 0; i < totalQuestions; i++) {
            String line = linePool.get(i % linePool.size());
            questions.add(buildClozeQuestion(line, vocabulary, bossEncounter));
        }
        return questions;
    }

    private EncounterQuizQuestion buildClozeQuestion(
        String sourceLine,
        List<String> vocabulary,
        boolean bossEncounter
    ) {
        String answer = pickTargetWord(sourceLine, bossEncounter);
        int optionCount = bossEncounter ? 4 : 3;

        if (answer == null) {
            return buildLineRecallQuestion(sourceLine, vocabulary, optionCount);
        }

        List<String> options = buildOptions(answer, vocabulary, optionCount, bossEncounter);
        Collections.shuffle(options);

        int correctOptionIndex = indexOfIgnoreCase(options, answer);
        if (correctOptionIndex < 0) {
            options.set(0, answer);
            correctOptionIndex = 0;
        }

        String prompt = "Fill in the blank:\n" + maskFirstOccurrence(sourceLine, answer);
        return new EncounterQuizQuestion(
            UUID.randomUUID().toString(),
            prompt,
            List.copyOf(options),
            correctOptionIndex
        );
    }

    private EncounterQuizQuestion buildLineRecallQuestion(
        String sourceLine,
        List<String> vocabulary,
        int optionCount
    ) {
        String answer = truncateForOption(sourceLine);
        List<String> options = new ArrayList<>();
        options.add(answer);

        List<String> shuffledPool = new ArrayList<>(vocabulary);
        Collections.shuffle(shuffledPool);
        for (String candidate : shuffledPool) {
            if (options.size() >= optionCount) break;
            String optionLine = "Concept: " + candidate;
            if (!containsIgnoreCase(options, optionLine)) options.add(optionLine);
        }
        while (options.size() < optionCount) {
            options.add("Concept: lesson");
        }

        Collections.shuffle(options);
        int correctOptionIndex = indexOfIgnoreCase(options, answer);
        return new EncounterQuizQuestion(
            UUID.randomUUID().toString(),
            "Which line best matches the lesson content?",
            List.copyOf(options),
            Math.max(0, correctOptionIndex)
        );
    }

    private List<String> buildOptions(String answer, List<String> vocabulary, int optionCount, boolean bossEncounter) {
        List<String> options = new ArrayList<>();
        options.add(answer);

        List<String> pool = vocabulary.stream()
            .filter(word -> !word.equalsIgnoreCase(answer))
            .toList();

        List<String> rankedPool = new ArrayList<>(pool);
        if (bossEncounter) {
            rankedPool.sort(Comparator.comparingInt(word -> Math.abs(word.length() - answer.length())));
        } else {
            Collections.shuffle(rankedPool);
        }

        for (String candidate : rankedPool) {
            if (options.size() >= optionCount) break;
            if (!containsIgnoreCase(options, candidate)) options.add(candidate);
        }

        for (String fallback : List.of("community", "culture", "identity", "history", "language")) {
            if (options.size() >= optionCount) break;
            if (!containsIgnoreCase(options, fallback) && !fallback.equalsIgnoreCase(answer)) {
                options.add(fallback);
            }
        }

        return options;
    }

    private String pickTargetWord(String line, boolean bossEncounter) {
        List<String> candidates = extractWords(line).stream()
            .filter(word -> !STOP_WORDS.contains(word.toLowerCase()))
            .distinct()
            .sorted(Comparator.comparingInt(String::length).reversed())
            .toList();

        if (candidates.isEmpty()) return null;
        if (!bossEncounter) return candidates.get(0);

        int hardIndex = Math.min(2, candidates.size() - 1);
        return candidates.get(hardIndex);
    }

    private String maskFirstOccurrence(String text, String word) {
        Pattern pattern = Pattern.compile("(?i)\\b" + Pattern.quote(word) + "\\b");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) return matcher.replaceFirst("____");
        return text;
    }

    private List<String> extractVocabulary(List<String> lines) {
        LinkedHashSet<String> words = new LinkedHashSet<>();
        for (String line : lines) {
            for (String word : extractWords(line)) {
                if (!STOP_WORDS.contains(word.toLowerCase())) {
                    words.add(word);
                }
            }
        }
        return new ArrayList<>(words);
    }

    private List<String> extractWords(String text) {
        List<String> words = new ArrayList<>();
        Matcher matcher = WORD_PATTERN.matcher(text == null ? "" : text);
        while (matcher.find()) {
            words.add(matcher.group());
        }
        return words;
    }

    private boolean containsIgnoreCase(Collection<String> values, String candidate) {
        for (String value : values) {
            if (value != null && value.equalsIgnoreCase(candidate)) return true;
        }
        return false;
    }

    private int indexOfIgnoreCase(List<String> values, String target) {
        for (int i = 0; i < values.size(); i++) {
            if (values.get(i) != null && values.get(i).equalsIgnoreCase(target)) return i;
        }
        return -1;
    }

    private String truncateForOption(String line) {
        if (line == null) return "";
        return line.length() > 64 ? line.substring(0, 63) + "..." : line;
    }

    private List<String> fallbackLessonLines(String monsterName) {
        return List.of(
            "Learning builds confidence through repetition and reflection.",
            "Cultural context helps explain why people use certain expressions.",
            "Vocabulary changes quickly across online communities and trends.",
            "Respectful communication strengthens community trust and belonging.",
            "Practice and feedback help learners apply concepts in real situations.",
            "Critical thinking helps learners identify reliable sources and meaning.",
            "The " + monsterName + " challenge rewards careful reading and accurate recall."
        );
    }
}
