# Tests To Implement

This file is a backlog of test cases to add to strengthen release confidence. It is organized by cross-cutting gaps and by service. The **Critical Paths** and **Highest Value Tests** sections at the end highlight what matters most for production release readiness.

## Cross-Cutting Gaps

### 1) Persistence Integration (Beyond Simple Repository Tests)
- ✅ Done: Added `LearnerRepositoryDataJpaTest` (`@DataJpaTest`) to validate soft-delete behavior (`findByIs_activeTrue` / `existsBySupabaseUserIdAndIs_activeTrue`) and persistence constraints (`username` validation failure path).
- Verified via `cd Backend/player-service && ./mvnw -Dtest='LearnerRepositoryDataJpaTest,LearnerControllerIntegrationTest,LeaderboardServiceUnitTest' test`.

### 2) Validation and Error Mapping
- ✅ Done: Extended `LearnerControllerIntegrationTest` with malformed JSON and invalid UUID path tests, and updated `GlobalExceptionHandler` in player-service to map these to consistent `400` responses.
- Verified via `cd Backend/player-service && ./mvnw -Dtest='LearnerRepositoryDataJpaTest,LearnerControllerIntegrationTest,LeaderboardServiceUnitTest' test`.

### 3) Authorization and Role Enforcement
- ✅ Done: Added `AdministratorControllerSecurityIntegrationTest` to assert `401` (missing auth), `403` (non-admin role), and successful admin access for protected admin endpoints.
- Verified via `cd Backend/identity-service && ./mvnw -Dtest='AuthRoleControllerDownstreamUnitTest,AdministratorControllerSecurityIntegrationTest' test`.

### 4) Downstream Service Interactions
- ✅ Done: Extended `AuthRoleControllerDownstreamUnitTest` with downstream `5xx` behavior; together with existing `404` coverage it verifies safe fallback role resolution for `RestTemplate` failures.
- Verified via `cd Backend/identity-service && ./mvnw -Dtest='AuthRoleControllerDownstreamUnitTest,AdministratorControllerSecurityIntegrationTest' test`.

### 5) Redis-Backed Paths
- ✅ Done: Expanded `LeaderboardServiceUnitTest` with Redis-available read path, empty-leaderboard path, and rebuild-index behavior assertions.
- Verified via `cd Backend/player-service && ./mvnw -Dtest='LearnerRepositoryDataJpaTest,LearnerControllerIntegrationTest,LeaderboardServiceUnitTest' test`.

## Service-Specific Backlog

### identity-service
- ✅ Done: Added duplication coverage and enforcement for admin/contributor creation in `AdministratorServiceUnitTest` and `ContributorServiceUnitTest` (duplicate Supabase user + duplicate email/user ID paths).
- ✅ Done: Added JWT/claims edge-case coverage in `AuthRoleControllerIntegrationTest` for missing subject and invalid UUID subject (unauthorized responses).
- ℹ️ Note: JWT signature verification is handled by Spring Security resource-server decoding; service-level test coverage focuses on controller claim handling paths.
- ✅ Done: Added role-resolution safeguards in `AuthRoleControllerDownstreamUnitTest` for inactive contributor rejection and admin precedence over contributor.
- Verified via `cd Backend/identity-service && ./mvnw -Dtest='AdministratorServiceUnitTest,ContributorServiceUnitTest,AuthRoleControllerIntegrationTest,AuthRoleControllerDownstreamUnitTest,AdministratorControllerSecurityIntegrationTest,AdministratorControllerErrorTest' test`.

### game-service
- ✅ Done: Added monsters API validation coverage in `MonsterControllerIntegrationTest` for missing/blank required fields on create and update (`400`) and invalid UUID path handling (`400`).
- ✅ Done: Added domain-rule coverage for encounter/NPC progression gating in `EncounterServiceUnitTest` (monster unlock blocked until required NPC lessons are complete).
- ✅ Done: Added protected endpoint auth coverage in `MonsterControllerIntegrationTest` for `401` without authentication.
- Verified via `cd Backend/game-service && ./mvnw -Dtest='MonsterControllerIntegrationTest,EncounterServiceUnitTest' test`.

### learning-service
- ✅ Done: Added/extended map-quiz scoring coverage in `MapQuizServiceUnitTest` for multi-select exact-match scoring, partial-correct scoring across questions, and learner-facing question ordering.
- ✅ Done: Added/verified publish/unpublish rule coverage in `MapQuizServiceUnitTest` (publish failure when required title is missing; unpublish does not touch learner attempts).
- ✅ Done: Added/verified learner-gating error coverage in `MapQuizServiceUnitTest` for learner-not-found, quiz-not-found, and NPC-completion-required paths.
- Verified via `cd Backend/learning-service && ./mvnw -Dtest='MapQuizServiceUnitTest,MapQuizControllerIntegrationTest' test`.

### player-service
- ✅ Done: Added learner create/update validation coverage in `LearnerControllerIntegrationTest` and `LearnerProgressionIntegrationTest` for invalid email, missing full name, and partial update preservation of unspecified fields.
- ✅ Done: Added XP/level boundary and safety coverage in `LearnerServiceUnitTest` for exact thresholds, negative award clamp behavior, and integer-overflow clamping.
- ✅ Done: Added/verified leaderboard integration coverage in `LearnerProgressionIntegrationTest` and `LeaderboardServiceUnitTest` for redis-available read path and safe fallback behavior.
- ✅ Done: Verified auth/profile consistency for `/api/players/profile` in `SecurityConfigTest` (`401` unauthenticated, authenticated request allowed through authorization layer).
- Verified via `cd Backend/player-service && ./mvnw -Dtest='LearnerServiceUnitTest,LearnerControllerIntegrationTest,LearnerProgressionIntegrationTest,LearnerProfileStateControllerIntegrationTest,LeaderboardServiceUnitTest,SecurityConfigTest' test`.

## Critical Paths For Production Releases
These flows must be reliable before shipping because they directly impact user access, core gameplay progression, and data integrity.

1) **Authentication & Role Resolution**
   - ✅ Done: Covered role resolution and protected endpoint behavior via `AuthRoleControllerIntegrationTest` and `AuthRoleControllerDownstreamUnitTest`.
   - Verified via `cd Backend/identity-service && ./mvnw -Dtest='AuthRoleControllerIntegrationTest,AuthRoleControllerDownstreamUnitTest' test`.

2) **Player Profile Creation and Progression**
   - ✅ Done: Covered create learner profile, XP/level progression, and partial update integrity in `LearnerProgressionIntegrationTest`.
   - Verified via `cd Backend/player-service && ./mvnw -Dtest='LearnerProgressionIntegrationTest,LeaderboardServiceUnitTest' test`.

3) **Game Content Access**
   - ✅ Done: Covered monsters endpoint access plus NPC-completion gating logic in `MonsterControllerIntegrationTest` and `EncounterServiceUnitTest`.
   - Verified via `cd Backend/game-service && ./mvnw -Dtest='MonsterControllerIntegrationTest,EncounterServiceUnitTest' test`.

4) **Learning/Quiz Flow**
   - ✅ Done: Covered quiz fetch/attempt and multi-select scoring behavior in `MapQuizControllerIntegrationTest` and `MapQuizServiceUnitTest`.
   - Verified via `cd Backend/learning-service && ./mvnw -Dtest='MapQuizServiceUnitTest,MapQuizControllerIntegrationTest' test`.

5) **Leaderboard**
   - ✅ Done: Covered leaderboard update and rank retrieval after XP changes in `LearnerProgressionIntegrationTest` with supporting service checks in `LeaderboardServiceUnitTest`.
   - Verified via `cd Backend/player-service && ./mvnw -Dtest='LearnerProgressionIntegrationTest,LeaderboardServiceUnitTest' test`.

## Highest Value Tests
If you only add a small number of tests, these deliver the most confidence per effort.

1) **Player-service integration: create learner + award XP + leaderboard sync**
   - ✅ Done: Implemented `LearnerProgressionIntegrationTest` covering create learner -> award XP -> leaderboard + rank verification.
   - Verified via `./mvnw -Dtest='LearnerProgressionIntegrationTest' test`.

2) **Learning-service: submit quiz attempt with multi-select scoring**
   - ✅ Done: Added multi-select exact-match and partial-correct scoring coverage in `MapQuizServiceUnitTest`.
   - Verified via `./mvnw -Dtest='MapQuizServiceUnitTest' test`.

3) **Identity-service: role resolution with admin vs contributor conflict**
   - ✅ Done: Implemented `AuthRoleControllerDownstreamUnitTest` to validate admin precedence when both roles exist.
   - Verified via `./mvnw -Dtest='AuthRoleControllerDownstreamUnitTest' test`.

4) **Game-service: monsters create/update validation & auth**
   - ✅ Done: Extended `MonsterControllerIntegrationTest` with auth-required and invalid UUID-path validation scenarios.
   - Verified via `./mvnw -Dtest='MonsterControllerIntegrationTest' test`.

5) **Cross-service error mapping for downstream calls**
   - ✅ Done: Added downstream `404` mapping assertion in `AuthRoleControllerDownstreamUnitTest` for learner role resolution via `RestTemplate`.
   - Verified via `./mvnw -Dtest='AuthRoleControllerDownstreamUnitTest' test`.

## Day 3 Missing Tests (Story 9.2 Gaps)
These are the concrete missing items to satisfy the Day 3 checklist in `task.md`.

### Required: 1 Integration Test per Microservice (Critical Controller Endpoint)
- **gateway**
  - ✅ Done: Added gateway integration coverage for route fallback endpoint via `FallbackControllerIntegrationTest`.
- **identity-service**
  - ✅ Done: Added controller integration test for auth/role endpoint via `AuthRoleControllerIntegrationTest`.
- **learning-service**
  - ✅ Done: Added controller integration test for quiz endpoint via `MapQuizControllerIntegrationTest`.
- **game-service**
  - Already has `MonsterControllerIntegrationTest` (counts).
- **player-service**
  - Already has `LearnerControllerIntegrationTest` (counts).

### Required: At Least 2 Unit Tests for Core Service Classes per Microservice
- **gateway**
  - ✅ Done: Added gateway unit tests for rate limiter behavior via `RateLimiterConfigUnitTest` (fallback unit test coverage already exists).
- **identity-service**
  - Already has multiple unit tests (AuthRole, Admin, Contributor) — OK.
- **learning-service**
  - ✅ Done: Added second core service unit test via `TopicServiceUnitTest` (in addition to `MapQuizServiceUnitTest`).
- **game-service**
  - ✅ Done: Added second core service unit test via `NPCServiceUnitTest` (in addition to `MonsterServiceUnitTest`).
- **player-service**
  - ✅ Done: Added second core service unit test via `LeaderboardServiceUnitTest` (in addition to `LearnerServiceUnitTest`).
