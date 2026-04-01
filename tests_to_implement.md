# Tests To Implement

This file is a backlog of test cases to add to strengthen release confidence. It is organized by cross-cutting gaps and by service. The **Critical Paths** and **Highest Value Tests** sections at the end highlight what matters most for production release readiness.

## Cross-Cutting Gaps

### 1) Persistence Integration (Beyond Simple Repository Tests)
- Add `@DataJpaTest` or `@SpringBootTest` coverage for core domain aggregates to validate:
  - Entity relationships are mapped correctly (join tables, cascades).
  - Constraints and unique indexes behave as expected.
  - Soft-delete or status flags behave correctly.

### 2) Validation and Error Mapping
- For create/update endpoints across services:
  - Missing required fields return `400` with consistent error payload.
  - Invalid UUID path parameters return `400` or `404` consistently.
  - Malformed JSON returns `400`.

### 3) Authorization and Role Enforcement
- Role-based access tests for endpoints that require admin/contributor:
  - Ensure `403` for users without required role.
  - Validate claims parsing and missing/invalid JWTs.

### 4) Downstream Service Interactions
- For services using `RestTemplate`:
  - Downstream `404` maps to the expected error path.
  - Downstream `5xx` maps to fallback or appropriate errors.
  - Timeouts/retries do not create duplicates or corrupt state.

### 5) Redis-Backed Paths
- Add tests that run with Redis available:
  - Leaderboard writes and reads succeed.
  - Rebuild logic creates the expected ranking order.
  - Empty leaderboard returns empty responses without errors.

## Service-Specific Backlog

### identity-service
- **Admin/Contributor duplication rules**
  - Attempt to create a second admin for same Supabase user.
  - Attempt to create contributor with duplicate email or user ID.
- **JWT/Claims edge cases**
  - Missing subject claim returns unauthorized or safe error.
  - Invalid JWT signature (if validation is part of service).
- **Role resolution**
  - Contributor inactive should not pass `isContributor`.
  - Admin precedence over contributor is enforced for all endpoints.

### game-service
- **Monsters API validation**
  - Missing required fields on create/update return `400`.
  - Invalid UUID in path returns `400` or `404` (consistent).
- **Domain logic tests**
  - Any rules for map/encounter/NPC flows:
    - Interactions gating progression.
    - Map/encounter dependencies (if any).
- **Security**
  - Protected endpoints return `401` without auth, `403` without role.

### learning-service
- **Map quiz scoring**
  - Multi-select questions scoring is correct.
  - Partial correct answers score correctly.
  - Question ordering is preserved.
- **Publish/unpublish rules**
  - Publish fails if required fields missing.
  - Unpublish does not invalidate prior attempts incorrectly.
- **Learner gating**
  - Learner not found -> correct error.
  - Quiz not found -> correct error.
  - NPC completion required -> correct error.

### player-service
- **Learner create/update validation**
  - Invalid email format rejects.
  - Missing username/full name rejects.
  - Partial update does not overwrite unspecified fields.
- **XP/level calculation**
  - Boundary tests (exact thresholds, large XP, zero/negative).
  - Overflows or negative values are handled safely.
- **Leaderboard integration**
  - Redis available path: write + read + rank.
  - Learner missing from Redis returns safe fallback.
- **Auth and profile**
  - Unauthorized vs forbidden responses are consistent across `/api/players/profile`.

## Critical Paths For Production Releases
These flows must be reliable before shipping because they directly impact user access, core gameplay progression, and data integrity.

1) **Authentication & Role Resolution**
   - Login/role checks for Admin/Contributor/Player paths.
   - Ensures access control for protected endpoints.

2) **Player Profile Creation and Progression**
   - Create learner profile.
   - Award XP and level progression.
   - Update profile data without corruption.

3) **Game Content Access**
   - Fetch monsters/maps/NPC content.
   - Gating logic does not break progression.

4) **Learning/Quiz Flow**
   - Create/publish quizzes.
   - Learner fetches quiz, submits attempt, receives score.

5) **Leaderboard**
   - Leaderboard updates on XP changes.
   - Ranking read is correct and stable.

## Highest Value Tests
If you only add a small number of tests, these deliver the most confidence per effort.

1) **Player-service integration: create learner + award XP + leaderboard sync**
   - End-to-end with real DB + Redis.
   - Verifies core progression path.

2) **Learning-service: submit quiz attempt with multi-select scoring**
   - Validates correctness of learning progression and scoring.

3) **Identity-service: role resolution with admin vs contributor conflict**
   - Ensures role checks are correct for security.

4) **Game-service: monsters create/update validation & auth**
   - Verifies protected endpoints and data validation.

5) **Cross-service error mapping for downstream calls**
   - Confirms resilience when dependent services fail.

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
