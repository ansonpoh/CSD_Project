# Tests To Implement

Current coverage after implementing Phases 1-4:
- `player-service`: instruction 55%, branch 37%
- `learning-service`: instruction 53%, branch 41%
- `game-service`: instruction 64%, branch 46%

Goal: prioritize branch-heavy service logic first, then controller/API paths.

Total planned tests: **197**
- `player-service`: 70
- `learning-service`: 56
- `game-service`: 71

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
- [x] `searchByUsername` rejects query shorter than 2 chars.
- [x] `searchByUsername` returns empty list when no candidates.
- [x] `searchByUsername` resolves `NONE` relationship when no friendship exists.
- [x] `sendRequest` rejects self-request.
- [x] `sendRequest` creates pending request when no prior friendship exists.
- [x] `sendRequest` rejects when friendship already `ACCEPTED`.
- [x] `sendRequest` rejects duplicate outgoing pending request.
- [x] `sendRequest` rejects when incoming pending already exists.
- [x] `sendRequest` reopens `DECLINED` friendship into new pending request.
- [x] `acceptRequest` rejects non-addressee user.
- [x] `acceptRequest` rejects non-pending friendship.
- [x] `removeFriend` rejects non-accepted friendship and succeeds for accepted one.

`ChatService` (10)
- [x] `openOrCreateConversation` rejects chatting with self.
- [x] `openOrCreateConversation` rejects non-friends.
- [x] `openOrCreateConversation` returns existing conversation if present.
- [x] `openOrCreateConversation` creates new conversation if absent.
- [x] `listConversations` returns empty when no conversations exist.
- [x] `listMessages` rejects cursor from a different conversation.
- [x] `listMessages` returns `nextCursor` when page size exceeded.
- [x] `sendMessage` rejects when either side is blocked.
- [x] `sendMessage` rejects blank/oversized body and accepts trimmed valid body.
- [x] `updateSettings` creates default settings row when none exists.

`AchievementService` (8)
- [x] `recordEvent` no-ops for null learnerId/blank event type.
- [x] `recordEvent` no-ops on duplicate idempotency key.
- [x] `recordEvent` no-ops when learner not found.
- [x] `recordEvent` creates progress row for first matching achievement.
- [x] `recordEvent` handles BOOLEAN progress type correctly.
- [x] `recordEvent` unlocks achievement when target reached.
- [x] `claimAchievementForSupabaseUser` rejects invalid/not-unlocked cases.
- [x] `claimAchievementForSupabaseUser` applies XP/gold and calls leaderboard update once.

### Phase 2 (Mid ROI)

#### 3) learning-service (`QuizService`, `QuestionBankService`, `ContentService`) — 21 tests

`QuizService` (8)
- [x] `generateMonsterEncounterQuiz` rejects null request/mapId.
- [x] Boss encounter sets hard difficulty and stricter accuracy.
- [x] Normal encounter sets normal difficulty and expected required-correct count.
- [x] Monster-name resolution falls back to `"monster"` on game-service failure.
- [x] Lesson-line loading handles null/bad payload safely.
- [x] Question builder falls back when vocabulary pool is weak.
- [x] Cloze builder falls back to line-recall when no target word exists.
- [x] Output question count always matches configured total.

`QuestionBankService` (7)
- [x] `generateDraft` rejects when map content summary is empty.
- [x] `generateDraft` rejects malformed AI output with parse error.
- [x] `saveQuestions` rejects unknown map.
- [x] `saveQuestions` marks `isMultiSelect` true for >1 correct options.
- [x] `approveQuestion` rejects non-`PENDING_REVIEW`.
- [x] `rejectQuestion` rejects non-`PENDING_REVIEW`.
- [x] `addBankQuestionToQuiz` rejects non-approved bank question.

`ContentService` (6)
- [x] `submitContent` rejects invalid narration serialization.
- [x] `submitContent` rejects exact duplicate fingerprint.
- [x] `submitContent` rejects semantic duplicate from vector similarity.
- [x] `submitContent` rolls back saved content when NPC/map assignment fails.
- [x] `approveContent` rejects non-`PENDING_REVIEW`.
- [x] `rejectContent` rejects non-`PENDING_REVIEW`.

#### 4) player-service (`LearnerProfileStateService`, `PurchaseService`) — 8 tests

`LearnerProfileStateService` (4)
1. [x] `getProfileState` creates default state for new learner.
2. [x] `recordDailyQuestEvent(lesson_completed)` increments quest + learning streak.
3. [x] Daily quest state resets on date rollover.
4. [x] Daily streak increments only when all quests complete and not already completed today.

`PurchaseService` (4)
1. [x] `createPurchase` rejects unknown learner.
2. [x] `createPurchase` rejects insufficient gold.
3. [x] `createPurchase` creates purchase lines, deducts gold, updates inventory, emits event.
4. [x] `createPurchase` coerces non-positive quantity to 1 and handles null item price as 0.

### Phase 3 (Completeness + branch cleanup)

#### 5) learning-service (`ContentFlagService`, `ContentRatingService`, `MissionService`) — 13 tests

`ContentFlagService` (5)
1. [x] `createFlag` requires reason.
2. [x] `createFlag` requires details when reason is `OTHER`.
3. [x] `createFlag` rejects non-approved content.
4. [x] `createFlag` rejects duplicate open flag by same reporter.
5. [x] `reviewFlag` enforces valid review status + dismissal note + open-only review.

`ContentRatingService` (4)
1. [x] `updateRating` enforces rating bounds `1..5`.
2. [x] `updateRating` rejects rating for non-approved content.
3. [x] `updateRating` creates record when none exists.
4. [x] `updateRating` deduplicates multiple historical rows for same learner/content.

`MissionService` (4)
1. [x] `getDailyMissions` tops up when active+completed below daily cap.
2. [x] `getDailyMissions` does not top up when cap already reached.
3. [x] `submitReflection` approved path grants reward + marks mission completed.
4. [x] `submitReflection` rejected/flagged path does not grant reward.

### Phase 4 (Game-service follow-up coverage boost)

#### 6) game-service (`MapService`, `MapController`, `MapEditorDraftStore`, `JwtRoleConverter`, `InternalGameController`) — 27 tests

These are the next best game-service tests based on the current JaCoCo gaps. They target real editor workflow, auth resolution, and controller behavior that is still lightly tested.

`MapService` follow-up (8)
1. [x] `getEditorRuntimeData` returns `mapData` directly when the map already has persisted editor data.
2. [x] `getEditorRuntimeData` falls back to the latest submission snapshot when `mapData` is null.
3. [x] `getEditorRuntimeData` falls back to the linked draft payload when the asset uses the `editor-draft:` prefix.
4. [x] `getEditorRuntimeData` returns the `previewUnavailable` payload when there is no map data, no submission snapshot, and no draft.
5. [x] `submitDraft` converts editor payloads with `layers.ground/decor/collision` into tiled map JSON before saving.
6. [x] `submitDraft` preserves already-tiled map payloads instead of re-converting them.
7. [x] `approveMap` syncs `mapData` from the latest submission when the map itself has no `mapData`.
8. [x] `publishApprovedMap` syncs `mapData` from the latest submission when the approved map has no `mapData`.

`MapController` integration (6)
1. [x] `GET /api/maps/all` excludes unpublished maps for non-admin users.
2. [x] `GET /api/maps/all` includes unpublished maps for admin users.
3. [x] `PUT /api/maps/{mapId}/like` treats a null request body as `liked=false`.
4. [x] `PUT /api/maps/{mapId}/rating` treats a null request body as rating `0` and surfaces the service validation error cleanly.
5. [x] `POST /api/maps/editor/drafts/{draftId}/submit` accepts a null request body and delegates an empty `PublishDraftRequest`.
6. [x] `POST /api/maps/editor/drafts/{draftId}/publish` behaves as a backward-compatible alias for `/submit`.

`MapEditorDraftStore` (4)
1. [x] `save` trims text fields, keeps `createdAt` on update, and preserves existing publish metadata.
2. [x] `getMine` rejects access by a different owner and `getAny` throws when the draft is missing.
3. [x] `markPublished` updates the stored draft to `published=true` and sets `publishedMapId`.
4. [x] `listMine` ignores malformed JSON draft files and sorts valid drafts by `updatedAt` descending.

`JwtRoleConverter` (5)
1. [x] `convert` uses the `app_role` JWT claim when present and normalizes lowercase roles.
2. [x] `convert` chooses the highest-priority role from a JWT `roles` collection (`ADMIN` over `CONTRIBUTOR` over `LEARNER`).
3. [x] `convert` resolves role from `app_metadata.roles` or `app_metadata.role` when top-level claims are absent.
4. [x] `convert` falls back to the identity-service lookup when JWT role claims are missing and caches the result for repeated lookups.
5. [x] `convert` falls back to default `LEARNER` when identity-service lookup fails or returns an invalid role.

`InternalGameController` (4)
1. [x] `GET /api/internal/maps/{mapId}/contents` returns only rows with content IDs and maps the NPC/content fields correctly.
2. [x] `POST /api/internal/npc-maps` returns `400` with an error body when `NPCService.assignContent` throws.
3. [x] `GET /api/internal/encounters/all-npcs-completed` proxies the encounter-service result correctly.
4. [x] `GET /api/internal/monsters/{monsterId}` returns `"monster"` when a found monster has a null name.

### Phase 5 (Cross-service push toward 70/60)

#### 7) learning-service follow-up — 22 tests

These target the largest remaining instruction and branch gaps in learning-service after the earlier service/unit coverage work.

`AIService` (12)
1. [x] `generateBody` strips markdown code fences from AI output.
2. [x] `generateBody` removes trailing commas before closing JSON delimiters.
3. [x] `screenContent` saves moderation result and approves content when verdict is `APPROVED`.
4. [x] `screenContent` saves moderation result and rejects content when verdict is `REJECTED`.
5. [x] `screenContent` leaves content in review state when verdict is `NEEDS_REVIEW`.
6. [x] `screenContent` falls back to a `NEEDS_REVIEW` moderation result when AI parsing throws.
7. [x] `reviewReflection` returns the AI verdict and note on successful parse.
8. [x] `reviewReflection` falls back to `FLAGGED_FOR_REVIEW` when AI parsing throws.
9. [x] `generateQuizHint` returns fallback hint when prompt is blank or options are insufficient.
10. [x] `generateQuizHint` resolves correct option indexes from DB options when `questionId` is provided.
11. [x] `generateQuizHint` falls back to caller-supplied correct indexes when DB options are unavailable.
12. [x] `generateQuizHint` rejects answer-leaking AI hints and falls back to the safe hint.

`InternalLearningController` (6)
1. [x] `GET /api/internal/contents/{id}` returns content payload with rating fields when rating lookup succeeds.
2. [x] `GET /api/internal/contents/{id}` falls back to zero ratings when rating lookup throws.
3. [x] `POST /api/internal/contents/batch` returns an empty list for null or empty IDs.
4. [x] `GET /api/internal/topics/{id}` returns `404` when `TopicService` throws `ResourceNotFoundException`.
5. [x] `GET /api/internal/learning/analytics/{learnerId}` maps quiz summary and mission EXP history into the response.
6. [x] `GET /api/internal/learning/analytics/{learnerId}` tolerates repository exceptions and still returns a partial `200` response.

`QuestionBankService` follow-up (4)
1. [x] `getContentSummary` maps game-service content rows into summary DTOs.
2. [x] `getContentSummary` returns an empty list when game-service lookup throws.
3. [x] `updateQuestion` replaces old options and recomputes `isMultiSelect`.
4. [x] `getAllBankQuestions` returns question responses with option payloads and map-name fallback applied.

#### 8) player-service follow-up — 32 tests

These target the remaining high-value gaps in learner analytics, internal APIs, inventory/progress flows, and the still-undercovered friendship/chat logic.

`LearnerService` follow-up (11)
1. [x] `createLearner` rejects duplicate usernames case-insensitively.
2. [x] `getBySupabaseUserId` throws `ResourceNotFoundException` when no learner exists.
3. [x] `awardXpAndGoldBySupabaseUserId` skips `learnerXpRepository.save` when XP delta is zero.
4. [x] `updateLearner` applies provided fields including `isActive` and still syncs leaderboard.
5. [x] `getLearnerAnalytics` computes current EXP and EXP-to-next-level correctly from total XP and level.
6. [x] `getLearnerAnalytics` uses profile streak data when profile state exists.
7. [x] `getLearnerAnalytics` maps topic progress counts by `COMPLETED`, `IN_PROGRESS`, and `NOT_STARTED`.
8. [x] `getLearnerAnalytics` builds a 7-day EXP history from sparse `learner_xp` rows.
9. [x] `getLearnerAnalytics` falls back to zero EXP history when `learnerXpRepository` throws.
10. [x] `getLearnerAnalytics` applies remote quiz analytics from learning-service when available.
11. [x] `getLearnerAnalytics` ignores learning-service lookup failures and still returns local analytics.

`LearnerInventoryService` (5)
1. [x] `getMyInventory` maps learner inventory entities into response DTOs with item details.
2. [x] `addOrIncrement` creates a new inventory row with default quantity `1` when quantity is null.
3. [x] `addOrIncrement` increments quantity on an existing inventory row.
4. [x] `removeOrDecrement` deletes the inventory row when quantity reaches zero or below.
5. [x] `removeOrDecrement` decrements quantity and keeps the row when items remain.

`LearnerLessonProgressService` (4)
1. [x] `getMyProgress` maps repository rows into `LessonProgressResponse`.
2. [x] `enroll` creates a new `ENROLLED` progress row when none exists.
3. [x] `enroll` preserves `COMPLETED` status when re-enrolling an already completed lesson.
4. [x] `complete` creates or updates progress, sets timestamps correctly, and records the achievement event.

`InternalPlayerController` (6)
1. [x] `GET /api/internal/learners/supabase/{supabaseUserId}` returns default `0/1/0` values when learner XP, level, or gold are null.
2. [x] `POST /api/internal/learners/{learnerId}/award-xp` updates learner stats and leaderboard for a found learner.
3. [x] `POST /api/internal/progress/check-completed` returns `false` for an empty content list.
4. [x] `POST /api/internal/progress/check-completed` returns `true` only when completed count meets requested content count.
5. [x] `POST /api/internal/progress/content-completed/batch` returns an empty list for null or invalid request bodies.
6. [x] `GET /api/internal/progress/npc-completed` and `GET /api/internal/progress/content-completed` proxy repository booleans correctly.

`FriendshipService` follow-up (3)
1. [x] `declineRequest` updates status and timestamps for a valid pending request.
2. [x] `cancelOutgoingRequest` updates status and timestamps for a valid pending request.
3. [x] `listFriends` filters out inactive learners and sorts remaining friends alphabetically.

`ChatService` follow-up (3)
1. [x] `listConversations` sorts by last-message timestamp and falls back to `"Unknown"` when the friend record is missing.
2. [x] `clearConversationMessages` soft-deletes messages and clears `lastMessageAt`.
3. [x] `updateSettings` rejects self-targeting and updates an existing settings row cleanly.

#### 9) game-service final push — 14 tests

These target the remaining big instruction and branch contributors in game-service after the earlier map/editor/auth work.

`MapService` final follow-up (6)
1. [x] `getMapCatalog` returns an empty list when no maps exist.
2. [x] `getMapCatalog` still returns catalog entries when learner lookup fails and the request falls back to anonymous state.
3. [x] `getMapCatalog` maps average rating, rating count, like count, current-user rating, and current-user liked state correctly.
4. [x] `getDraft` throws `ResourceNotFoundException` when the draft is owned by another contributor.
5. [x] `publishApprovedMap` rejects missing `topicId`.
6. [x] `publishApprovedMap` rejects when topic lookup in learning-service fails.

`EncounterService` follow-up (5)
1. [x] `getEncounterState` builds NPC summary and monster state from completed content and stored monster progress.
2. [x] `markNpcInteracted` returns the completed message when the NPC lesson is already completed.
3. [x] `claimReward` awards boss-monster XP differently from a normal monster.
4. [x] `getTelemetryDashboard` filters by `mapId` and computes win/loss percentages correctly.
5. [x] `hasAllNpcsCompletedOnMap` returns `false` when the player-service check throws.

`MapController` follow-up (3)
1. [x] `GET /api/maps/{mapId}` returns the optional map payload from the service.
2. [x] `GET /api/maps/world/{worldId}` delegates world filtering correctly.
3. [x] `GET /api/maps/editor-data/{mapId}` returns the editor runtime payload from the service.

## Suggested File Mapping (where to add tests)

- `Backend/game-service/src/test/java/com/smu/csd/maps/MapServiceUnitTest.java` (extend)
- `Backend/game-service/src/test/java/com/smu/csd/maps/MapControllerIntegrationTest.java` (new)
- `Backend/game-service/src/test/java/com/smu/csd/maps/MapEditorDraftStoreUnitTest.java` (new)
- `Backend/game-service/src/test/java/com/smu/csd/encounters/EncounterServiceUnitTest.java` (extend)
- `Backend/game-service/src/test/java/com/smu/csd/npcs/NPCServiceUnitTest.java` (extend)
- `Backend/game-service/src/test/java/com/smu/csd/security/JwtRoleConverterUnitTest.java` (new)
- `Backend/game-service/src/test/java/com/smu/csd/InternalGameControllerUnitTest.java` (extend)
- `Backend/learning-service/src/test/java/com/smu/csd/ai/AIServiceUnitTest.java` (new)
- `Backend/learning-service/src/test/java/com/smu/csd/InternalLearningControllerUnitTest.java` (extend)
- `Backend/learning-service/src/test/java/com/smu/csd/quiz/question_bank/QuestionBankServiceUnitTest.java` (extend)
- `Backend/player-service/src/test/java/com/smu/csd/friendship/FriendshipServiceUnitTest.java` (extend)
- `Backend/player-service/src/test/java/com/smu/csd/chat/ChatServiceUnitTest.java` (extend)
- `Backend/player-service/src/test/java/com/smu/csd/achievements/AchievementServiceUnitTest.java` (extend)
- `Backend/player-service/src/test/java/com/smu/csd/learner_profile/LearnerProfileStateServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/economy/purchase/PurchaseServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/economy/inventory/LearnerInventoryServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/learner/LearnerServiceUnitTest.java` (extend)
- `Backend/player-service/src/test/java/com/smu/csd/learner_progress/LearnerLessonProgressServiceUnitTest.java` (new)
- `Backend/player-service/src/test/java/com/smu/csd/InternalPlayerControllerUnitTest.java` (extend)
- `Backend/learning-service/src/test/java/com/smu/csd/quiz/encounter/QuizServiceUnitTest.java` (extend)
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
6. Implement Phase 4 for game-service, then re-check `MapService`, `MapController`, `MapEditorDraftStore`, `JwtRoleConverter`, and `InternalGameController` specifically.
7. Implement Phase 5 in the order `learning-service -> player-service -> game-service`, then re-run the aggregate report and re-rank the remaining classes by missed instructions and missed branches.
