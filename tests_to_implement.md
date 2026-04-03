# Tests To Implement

Coverage baseline from `Backend/coverage-report/target/site/jacoco-aggregate/jacoco.csv`:
- `player-service`: instruction 10.1%, branch 1.3%
- `learning-service`: instruction 15.5%, branch 1.4%
- `game-service`: instruction 8.9%, branch 0.5%

Goal: prioritize branch-heavy service logic first, then controller/API paths.

Total planned tests: **102**
- `player-service`: 38
- `learning-service`: 34
- `game-service`: 30

## Implementation Order

### Phase 1 (Highest Coverage ROI first)

#### 1) game-service (`MapService`, `EncounterService`, `NPCService`) — 30 tests

`MapService` (14)
- [x] `getAllMaps(true)` returns all maps.
- [x] `getAllMaps(false)` returns published-only maps.
- [x] `updateMapLike` inserts like when `liked=true` and no existing record.
- [x] `updateMapLike` prunes duplicate like rows.
- [x] `updateMapLike` removes existing likes when `liked=false`.
- [x] `updateMapRating` enforces rating bounds `1..5`.
- [x] `updateMapRating` creates new rating row when absent.
- [x] `updateMapRating` deduplicates extra rating rows when multiple exist.
- [x] `saveMap` applies defaults for status/published/publishedAt.
- [x] `saveDraft` rejects draft update by non-owner.
- [x] `submitDraft` rejects non-owner access.
- [x] `approveMap` rejects non-`PENDING_REVIEW` map.
- [x] `rejectMap` requires non-blank reason.
- [x] `publishApprovedMap` requires valid topic and approved map status.

`EncounterService` (10)
- [x] `getEncounterState` rejects null `mapId`.
- [x] `markNpcInteracted` rejects null `mapId`/`npcId`.
- [x] `recordCombatResult` rejects null `mapId`/`monsterId`.
- [x] `recordCombatResult` rejects monster not belonging to map.
- [x] `recordCombatResult` rejects when NPC completion gate is not met.
- [x] Win path increments attempts/wins and marks defeated.
- [x] Loss path increments attempts/losses/loss streak.
- [x] `claimReward` rejects when monster not defeated.
- [x] `claimReward` first claim awards XP/gold and marks reward claimed.
- [x] `claimReward` second claim is idempotent (no double award).

`NPCService` (6)
- [x] `getNPCsByMapId` filters out non-approved content entries.
- [x] `getNPCsByMapId` returns empty safely when content-batch lookup fails.
- [x] `assignContent` rejects unpublished map.
- [x] `assignContent` rejects missing/unavailable content.
- [x] `assignContent` updates existing NPC-map mapping instead of duplicate.
- [x] `assignContent` rejects when approved NPC cap per map is exceeded.

#### 2) player-service (`FriendshipService`, `ChatService`, `AchievementService`) — 30 tests

`FriendshipService` (12)
1. `searchByUsername` rejects query shorter than 2 chars.
2. `searchByUsername` returns empty list when no candidates.
3. `searchByUsername` resolves `NONE` relationship when no friendship exists.
4. `sendRequest` rejects self-request.
5. `sendRequest` creates pending request when no prior friendship exists.
6. `sendRequest` rejects when friendship already `ACCEPTED`.
7. `sendRequest` rejects duplicate outgoing pending request.
8. `sendRequest` rejects when incoming pending already exists.
9. `sendRequest` reopens `DECLINED` friendship into new pending request.
10. `acceptRequest` rejects non-addressee user.
11. `acceptRequest` rejects non-pending friendship.
12. `removeFriend` rejects non-accepted friendship and succeeds for accepted one.

`ChatService` (10)
1. `openOrCreateConversation` rejects chatting with self.
2. `openOrCreateConversation` rejects non-friends.
3. `openOrCreateConversation` returns existing conversation if present.
4. `openOrCreateConversation` creates new conversation if absent.
5. `listConversations` returns empty when no conversations exist.
6. `listMessages` rejects cursor from a different conversation.
7. `listMessages` returns `nextCursor` when page size exceeded.
8. `sendMessage` rejects when either side is blocked.
9. `sendMessage` rejects blank/oversized body and accepts trimmed valid body.
10. `updateSettings` creates default settings row when none exists.

`AchievementService` (8)
1. `recordEvent` no-ops for null learnerId/blank event type.
2. `recordEvent` no-ops on duplicate idempotency key.
3. `recordEvent` no-ops when learner not found.
4. `recordEvent` creates progress row for first matching achievement.
5. `recordEvent` handles BOOLEAN progress type correctly.
6. `recordEvent` unlocks achievement when target reached.
7. `claimAchievementForSupabaseUser` rejects invalid/not-unlocked cases.
8. `claimAchievementForSupabaseUser` applies XP/gold and calls leaderboard update once.

### Phase 2 (Mid ROI)

#### 3) learning-service (`QuizService`, `QuestionBankService`, `ContentService`) — 21 tests

`QuizService` (8)
1. `generateMonsterEncounterQuiz` rejects null request/mapId.
2. Boss encounter sets hard difficulty and stricter accuracy.
3. Normal encounter sets normal difficulty and expected required-correct count.
4. Monster-name resolution falls back to `"monster"` on game-service failure.
5. Lesson-line loading handles null/bad payload safely.
6. Question builder falls back when vocabulary pool is weak.
7. Cloze builder falls back to line-recall when no target word exists.
8. Output question count always matches configured total.

`QuestionBankService` (7)
1. `generateDraft` rejects when map content summary is empty.
2. `generateDraft` rejects malformed AI output with parse error.
3. `saveQuestions` rejects unknown map.
4. `saveQuestions` marks `isMultiSelect` true for >1 correct options.
5. `approveQuestion` rejects non-`PENDING_REVIEW`.
6. `rejectQuestion` rejects non-`PENDING_REVIEW`.
7. `addBankQuestionToQuiz` rejects non-approved bank question.

`ContentService` (6)
1. `submitContent` rejects invalid narration serialization.
2. `submitContent` rejects exact duplicate fingerprint.
3. `submitContent` rejects semantic duplicate from vector similarity.
4. `submitContent` rolls back saved content when NPC/map assignment fails.
5. `approveContent` rejects non-`PENDING_REVIEW`.
6. `rejectContent` rejects non-`PENDING_REVIEW`.

#### 4) player-service (`LearnerProfileStateService`, `PurchaseService`) — 8 tests

`LearnerProfileStateService` (4)
1. `getProfileState` creates default state for new learner.
2. `recordDailyQuestEvent(lesson_completed)` increments quest + learning streak.
3. Daily quest state resets on date rollover.
4. Daily streak increments only when all quests complete and not already completed today.

`PurchaseService` (4)
1. `createPurchase` rejects unknown learner.
2. `createPurchase` rejects insufficient gold.
3. `createPurchase` creates purchase lines, deducts gold, updates inventory, emits event.
4. `createPurchase` coerces non-positive quantity to 1 and handles null item price as 0.

### Phase 3 (Completeness + branch cleanup)

#### 5) learning-service (`ContentFlagService`, `ContentRatingService`, `MissionService`) — 13 tests

`ContentFlagService` (5)
1. `createFlag` requires reason.
2. `createFlag` requires details when reason is `OTHER`.
3. `createFlag` rejects non-approved content.
4. `createFlag` rejects duplicate open flag by same reporter.
5. `reviewFlag` enforces valid review status + dismissal note + open-only review.

`ContentRatingService` (4)
1. `updateRating` enforces rating bounds `1..5`.
2. `updateRating` rejects rating for non-approved content.
3. `updateRating` creates record when none exists.
4. `updateRating` deduplicates multiple historical rows for same learner/content.

`MissionService` (4)
1. `getDailyMissions` tops up when active+completed below daily cap.
2. `getDailyMissions` does not top up when cap already reached.
3. `submitReflection` approved path grants reward + marks mission completed.
4. `submitReflection` rejected/flagged path does not grant reward.

## Suggested File Mapping (where to add tests)

- `Backend/game-service/src/test/java/com/smu/csd/maps/MapServiceUnitTest.java` (new)
- `Backend/game-service/src/test/java/com/smu/csd/encounters/EncounterServiceUnitTest.java` (extend)
- `Backend/game-service/src/test/java/com/smu/csd/npcs/NPCServiceUnitTest.java` (extend)
- `Backend/player-service/src/test/java/com/smu/csd/friendship/FriendshipServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/chat/ChatServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/achievements/AchievementServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/learner_profile/LearnerProfileStateServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/economy/purchase/PurchaseServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/quiz/encounter/QuizServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/quiz/question_bank/QuestionBankServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/contents/ContentServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/contents/flags/ContentFlagServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/contents/ratings/ContentRatingServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/missions/MissionServiceUnitTest.java` (new)

## Execution Plan

1. Implement and run Phase 1 service-by-service.
2. Re-run aggregate coverage report.
3. Implement Phase 2 based on remaining top missed classes.
4. Re-run aggregate coverage report.
5. Finish Phase 3 and re-check for any classes still below 40% instruction or 30% branch.
