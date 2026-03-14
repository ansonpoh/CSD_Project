# Jira Backlog: Microservices Migration, Hardening & Deployment

This backlog is the single source of truth for the microservices migration. It combines the strategic ordering of the architecture-first approach with the concrete, step-by-step technical actions from the migration plan.

> **Approach:** "Strangler Fig" — the Gateway proxies the old monolith on day 1. Services are extracted one at a time behind the gateway, letting you verify each step before the next.

---

## Epic 1: API Gateway Implementation
**Goal:** Install a single entry point (port `8080`) in front of the existing monolith. The frontend notices no change; the gateway just passes everything through to start.

### Story 1.1: Initialize Spring Cloud Gateway Project
**Description:** Scaffold a new Spring Boot project for the API Gateway.
**Sub-tasks:**
- Create directory `Backend/gateway/`.
- Use [start.spring.io](https://start.spring.io) to generate the project with dependencies: **Gateway**, **Reactive Web (WebFlux)**, **Actuator**, **Lombok**.
- Ensure `spring-boot-starter-parent` version matches `4.0.2` in `pom.xml`.
- Create a `Dockerfile` (copy the multi-stage pattern from `csd/Dockerfile`).

**Acceptance Criteria:**
- `Backend/gateway/` contains a valid `pom.xml` and builds with `./mvnw clean package -DskipTests`.
- `Dockerfile` builds successfully with `docker build .`.
- Service starts on port `8080`.

---

### Story 1.2: Configure Gateway to Proxy the Monolith
**Description:** Set up the gateway's `application.yaml` to forward all traffic to the existing monolith container (`csd-backend`).
**Sub-tasks:**
- Create `src/main/resources/application.yaml` in the gateway project.
- Add the following routing config:
  ```yaml
  server:
    port: 8080
  spring:
    application:
      name: gateway
    cloud:
      gateway:
        routes:
          - id: monolith-fallback
            uri: http://csd-backend:8080
            predicates:
              - Path=/api/**
        default-filters:
          - DedupeResponseHeader=Access-Control-Allow-Credentials Access-Control-Allow-Origin
  ```
- Configure CORS at the gateway level (remove `SecurityConfig` CORS from the monolith once gateway handles it).

**Acceptance Criteria:**
- Gateway routes all `/api/**` traffic to the monolith container.
- `Authorization` and other request headers are preserved during proxying.
- Health check at `http://localhost:8080/actuator/health` returns `{"status":"UP"}`.

---

### Story 1.3: Add Gateway to Docker Compose
**Description:** Integrate the gateway into the existing `docker-compose.yml` and update the monolith container to no longer expose port `8080` externally.
**Sub-tasks:**
- Add `gateway` service to `docker-compose.yml`:
  ```yaml
  gateway:
    build: ./gateway
    container_name: csd-gateway
    ports:
      - "8080:8080"
    depends_on:
      - backend
    environment:
      BACKEND_HOST: csd-backend
      BACKEND_PORT: 8080
  ```
- Change the `backend` service port mapping from `"8080:8080"` to an internal-only port (e.g., `"8090:8080"`) so only the gateway receives public traffic.

**Acceptance Criteria:**
- `docker compose up --build` starts both `csd-gateway` and `csd-backend`.
- Frontend can interact with the game normally through the gateway on `localhost:8080`.

---

## Epic 2: Identity Service Decomposition
**Goal:** Extract auth and role management into a standalone service. All other services will depend on this being stable first.

### Story 2.1: Scaffold Identity Service Project
**Description:** Create and configure the `identity-service` Spring Boot project.
**Sub-tasks:**
- Create directory `Backend/identity-service/`.
- Use [start.spring.io](https://start.spring.io) with dependencies: **Web**, **Security**, **OAuth2 Resource Server**, **JPA**, **PostgreSQL**, **Lombok**, **Validation**, **Actuator**, **dotenv-java**.
- Copy `pom.xml` dependencies from `csd/pom.xml` (match parent version `4.0.2`, include `jjwt-*` dependencies).
- Create `src/main/resources/application.yaml` with `server.port: 8081` and `spring.application.name: identity-service`.
- Copy Supabase DB datasource config from `csd/application.yaml`.

**Acceptance Criteria:**
- `Backend/identity-service/` builds with `./mvnw clean package -DskipTests`.
- Service starts on port `8081` without errors.

---

### Story 2.2: Migrate Identity Domain Packages
**Description:** Move the auth, roles, security, and config packages from the monolith into `identity-service`.
**Sub-tasks:**
- Copy the following packages from `csd/src/main/java/com/smu/csd/` to `identity-service/src/main/java/com/smu/csd/`:
  - `auth/`
  - `roles/`
  - `security/` (JwtRoleConverter, etc.)
  - `config/SecurityConfig.java`, `config/DotenvConfig.java`
  - `exception/GlobalExceptionHandler.java`
- Update package declarations in all moved files to match the new project (they should remain `com.smu.csd.*`).
- Verify all imports compile correctly.
- Create a `Dockerfile` using the same multi-stage pattern as `csd/Dockerfile`.

**Acceptance Criteria:**
- `identity-service` builds and starts successfully (`./mvnw spring-boot:run`).
- `GET /api/auth/role/me` returns a valid role when called with a valid Supabase JWT.

---

### Story 2.3: Update Gateway Routes for Identity
**Description:** Update the gateway to route identity-related endpoints to `identity-service` and everything else to the monolith.
**Sub-tasks:**
- Update `gateway/application.yaml` routes:
  ```yaml
  routes:
    - id: identity-service
      uri: http://identity-service:8081
      predicates:
        - Path=/api/auth/**, /api/administrators/**, /api/contributors/**
    - id: monolith-fallback
      uri: http://csd-backend:8090
      predicates:
        - Path=/api/**
  ```
- Add `identity-service` to `docker-compose.yml` (port `8081`, `env_file: .env`).
- Remove the `auth`, `roles`, `security`, and `config` packages from the monolith `csd` project.
- Run the monolith and confirm it still compiles and starts.

**Acceptance Criteria:**
- Gateway routes `/api/auth/**` to `identity-service:8081`.
- Gateway routes all other `/api/**` to the monolith.
- User login and JWT validation work end-to-end through the gateway.
- Monolith starts without the removed packages.

---

## Epic 3: Game World Service Decomposition
**Goal:** Extract maps, NPCs, monsters, animations, and encounters into `game-service`.

### Story 3.1: Scaffold Game Service Project
**Description:** Create and configure the `game-service` Spring Boot project.
**Sub-tasks:**
- Create directory `Backend/game-service/`.
- Dependencies: **Web**, **Security**, **OAuth2 Resource Server**, **JPA**, **PostgreSQL**, **Redis**, **Lombok**, **Validation**, **Actuator**, **dotenv-java**.
- Set `server.port: 8082` in `application.yaml`.
- Copy shared infrastructure into `game-service`:
  - `config/SecurityConfig.java`, `config/DotenvConfig.java`
  - `security/` (JwtRoleConverter)
  - `exception/GlobalExceptionHandler.java`
  - `redis/RedisConfig.java`

**Acceptance Criteria:**
- `Backend/game-service/` builds with `./mvnw clean package -DskipTests`.
- Service starts on port `8082`.

---

### Story 3.2: Migrate Game World Domain Packages
**Description:** Move game world packages from the monolith into `game-service`.
**Sub-tasks:**
- Copy the following packages from `csd/src/main/java/com/smu/csd/` to `game-service`:
  - `maps/`
  - `npcs/`
  - `monsters/`
  - `animations/`
  - `encounters/`
- Verify all imports compile (check for any cross-domain references to packages in other services).
- Create a `Dockerfile`.

**Acceptance Criteria:**
- `game-service` builds and starts successfully.
- `GET /api/maps/all` returns a valid list of maps when called with a valid JWT.

---

### Story 3.3: Update Gateway Routes for Game World
**Description:** Add game world routes to the gateway and remove those packages from the monolith.
**Sub-tasks:**
- Update `gateway/application.yaml`:
  ```yaml
  - id: game-service
    uri: http://game-service:8082
    predicates:
      - Path=/api/maps/**, /api/npcs/**, /api/monsters/**, /api/animations/**, /api/encounters/**
  ```
- Add `game-service` to `docker-compose.yml` (port `8082`, depends on `redis`, `env_file: .env`).
- Remove game world packages from `csd` (monolith). Confirm monolith still compiles.

**Acceptance Criteria:**
- Game map loads correctly in the frontend through the gateway.
- NPC and monster data is served correctly.
- Encounter quiz trigger works end-to-end.
- Monolith compiles and starts without the removed packages.

---

## Epic 4: Learning & AI Service Decomposition
**Goal:** Extract quiz, AI generation, and content management into `learning-service`.

### Story 4.1: Scaffold Learning Service Project
**Description:** Create the `learning-service` Spring Boot project.
**Sub-tasks:**
- Create directory `Backend/learning-service/`.
- Dependencies: **Web**, **Security**, **OAuth2 Resource Server**, **JPA**, **PostgreSQL**, **Lombok**, **Validation**, **Actuator**, **dotenv-java**, **spring-ai-starter-model-openai**, **spring-ai-starter-vector-store-pgvector**.
- Set `server.port: 8083` in `application.yaml`.
- Copy shared infrastructure: `SecurityConfig`, `JwtRoleConverter`, `GlobalExceptionHandler`.
- Configure OpenAI and pgvector settings in `application.yaml` (copy from `csd/application.yaml`).

**Acceptance Criteria:**
- `Backend/learning-service/` builds with `./mvnw clean package -DskipTests`.
- Service starts on port `8083`.

---

### Story 4.2: Migrate Learning & AI Domain Packages
**Description:** Move quiz, AI, and content packages from the monolith into `learning-service`.
**Sub-tasks:**
- Copy the following from `csd/src/main/java/com/smu/csd/`:
  - `quiz/`
  - `ai/`
  - `contents/`
- Move the `OPENAI_API_KEY` exclusively to the `learning-service` environment. Remove it from other service configs.
- Create a `Dockerfile`.

**Acceptance Criteria:**
- `learning-service` builds and starts successfully.
- `POST /api/quizzes/monster-encounter` returns a valid AI-generated quiz.
- Content submission and moderation endpoints function correctly.

---

### Story 4.3: Update Gateway Routes for Learning & AI
**Description:** Add AI/learning routes to the gateway and clean up the monolith.
**Sub-tasks:**
- Update `gateway/application.yaml`:
  ```yaml
  - id: learning-service
    uri: http://learning-service:8083
    predicates:
      - Path=/api/quizzes/**, /api/ai/**, /api/contents/**, /api/question-bank/**, /api/map-quizzes/**, /api/topic/**
  ```
- Add `learning-service` to `docker-compose.yml` (port `8083`, `env_file: .env`).
- Remove learning packages from `csd`. Confirm monolith still compiles.

**Acceptance Criteria:**
- Quiz encounter flow works end-to-end in the frontend.
- AI narration generation works for contributors.
- Monolith compiles and starts without the removed packages.

---

## Epic 5: Player & Economy Service Decomposition
**Goal:** Extract learner profiles, economy, and leaderboard into `player-service`. This finalizes the decomposition.

### Story 5.1: Scaffold Player Service Project
**Description:** Create the `player-service` Spring Boot project.
**Sub-tasks:**
- Create directory `Backend/player-service/`.
- Dependencies: **Web**, **Security**, **OAuth2 Resource Server**, **JPA**, **PostgreSQL**, **Redis**, **Lombok**, **Validation**, **Actuator**, **dotenv-java**.
- Set `server.port: 8084` in `application.yaml`.
- Copy shared infrastructure: `SecurityConfig`, `JwtRoleConverter`, `GlobalExceptionHandler`, `RedisConfig`.

**Acceptance Criteria:**
- `Backend/player-service/` builds with `./mvnw clean package -DskipTests`.
- Service starts on port `8084`.

---

### Story 5.2: Migrate Player & Economy Domain Packages
**Description:** Move economy, leaderboard, and learner packages from the monolith into `player-service`.
**Sub-tasks:**
- Copy the following from `csd/src/main/java/com/smu/csd/`:
  - `economy/`
  - `leaderboard/`
  - `learner/`
- Create a `Dockerfile`.

**Acceptance Criteria:**
- `player-service` builds and starts successfully.
- `GET /api/learner/me` returns the current learner's profile.
- `GET /api/leaderboard` returns the global leaderboard.

---

### Story 5.3: Update Gateway Routes & Decommission Monolith
**Description:** Add player routes to the gateway and fully decommission the `csd` monolith container.
**Sub-tasks:**
- Update `gateway/application.yaml`:
  ```yaml
  - id: player-service
    uri: http://player-service:8084
    predicates:
      - Path=/api/economy/**, /api/learner/**, /api/leaderboard/**, /api/inventory/**, /api/purchases/**
  ```
- Remove the `monolith-fallback` catch-all route from the gateway. All routes must now point to a specific microservice.
- Remove the `csd-backend` (monolith) service from `docker-compose.yml`.
- Add `player-service` to `docker-compose.yml` (port `8084`, depends on `redis`).

**Acceptance Criteria:**
- All 5 services start with `docker compose up --build`.
- `csd-backend` (monolith) is NOT running.
- Frontend game is fully playable end-to-end without the monolith.

---

### Story 5.4: Database Schema Separation
**Description:** Ensure each microservice accesses only its own database tables.
**Sub-tasks:**
- Audit each service for any JPA entities or repositories that reference tables "owned" by another service.
- Replace any cross-service DB queries with REST API calls to the owning service.
- Document each service's table ownership:
  - Identity: `users`, `roles`, `administrators`, `contributors`
  - Game: `maps`, `map_drafts`, `npcs`, `monsters`, `animations`, `encounters`
  - Learning: `quizzes`, `quiz_questions`, `contents`, `content_vectors`, `question_bank`, `topics`, `map_quizzes`
  - Player: `learners`, `learner_progress`, `items`, `inventory`, `purchases`, `leaderboard`

**Acceptance Criteria:**
- No service queries a table it does not own.
- Cross-service data needs are resolved via HTTP calls between services.

---

## Epic 6: Final System Verification
**Goal:** Run a full end-to-end smoke test of the microservice architecture before hardening.

### Story 6.1: Run Verification Checklist
**Description:** Systematically verify each service is running and responding correctly using `docker compose up --build`.
**Sub-tasks:**
- [ ] All 5 services have `pom.xml` and build successfully (`./mvnw clean install`).
- [ ] `gateway` is running on port `8080`.
- [ ] `identity-service` is running on `8081`. Test: `GET /api/auth/role/me` with a valid JWT.
- [ ] `game-service` is running on `8082`. Test: `GET /api/maps/all` returns data.
- [ ] `learning-service` is running on `8083`. Test: `GET /api/contents/all` returns data.
- [ ] `player-service` is running on `8084`. Test: `GET /api/learner/me` returns profile.
- [ ] Frontend can login (hits Identity via Gateway).
- [ ] Frontend loads map (hits Game via Gateway).
- [ ] Frontend starts quiz encounter (hits Learning via Gateway).
- [ ] Frontend shows leaderboard (hits Player via Gateway).
- [ ] Swagger UI is accessible at `localhost:8080/swagger-ui.html` (via Gateway).

**Acceptance Criteria:**
- All checklist items pass.
- No errors in any container logs that indicate cross-service routing failures.

---

## Epic 7: Microservice Hardening & Resilience
**Goal:** Add observability, resilience, and rate limiting now that the architecture is stable.

### Story 7.1: Add Distributed Tracing (Observability)
**Description:** Add Micrometer Tracing to the gateway and all services so requests can be traced across the system.
**Sub-tasks:**
- Add `micrometer-tracing-bridge-brave` and `zipkin-reporter-brave` to the `pom.xml` of all 5 services.
- Configure `management.zipkin.tracing.endpoint` in `application.yaml`.
- Add a Zipkin container to `docker-compose.yml`:
  ```yaml
  zipkin:
    image: openzipkin/zipkin
    ports: ["9411:9411"]
  ```
- Verify `traceId` is present in all service logs.

**Acceptance Criteria:**
- Zipkin UI at `localhost:9411` shows traces for requests that flow through the gateway.
- Each request has a unique `traceId` in the logs.

---

### Story 7.2: Implement Circuit Breaker (Game Service)
**Description:** Add Resilience4j to the Gateway to handle Game Service failures gracefully.
**Sub-tasks:**
- Add `spring-cloud-starter-circuitbreaker-reactor-resilience4j` to gateway `pom.xml`.
- Configure circuit breaker filter for game-service routes in `application.yaml`.
- Define a fallback controller that returns a structured error response in the Gateway.

**Acceptance Criteria:**
- When `game-service` is stopped, the Gateway returns a `503` with a meaningful error message.
- Circuit breaker transitions (CLOSED → OPEN) are visible in logs.

---

### Story 7.3: Implement Rate Limiting (AI Endpoints)
**Description:** Protect OpenAI endpoints from excessive calls using Redis-backed rate limiting at the Gateway.
**Sub-tasks:**
- Add `spring-cloud-starter-gateway` rate limiter filter (uses Redis).
- Configure `RequestRateLimiter` filter on `/api/ai/**` routes.
- Set `redis-rate-limiter.replenishRate` and `burstCapacity` via environment variables.

**Acceptance Criteria:**
- Requests to `/api/ai/**` beyond the configured rate return `429 Too Many Requests`.
- Rate limit thresholds can be changed without a code deployment.

---

## Epic 8: Environment Configuration
**Goal:** Establish consistent Dev/Staging/Prod environments across all microservices.

### Story 8.1: Implement Spring Boot Environment Profiles
**Description:** Create `application-{dev|staging|prod}.yaml` in each service.
**Sub-tasks:**
- For each of the 5 services, create:
  - `application-dev.yaml` — sets `hibernate.ddl-auto: update`, `show-sql: true`.
  - `application-staging.yaml` — points to staging Supabase project, `show-sql: false`.
  - `application-prod.yaml` — sets `hibernate.ddl-auto: validate`, `show-sql: false`.
- Activate profile via `SPRING_PROFILES_ACTIVE` env var in `docker-compose.yml`.

**Acceptance Criteria:**
- Setting `SPRING_PROFILES_ACTIVE=dev` loads the dev config in all services.
- `application-prod.yaml` never sets `ddl-auto` to `create` or `update`.

---

### Story 8.2: Standardize Secret Management
**Description:** Create per-environment `.env` files for secrets.
**Sub-tasks:**
- Create `Backend/.env.dev`, `Backend/.env.staging`, `Backend/.env.prod`.
- Ensure only `.env` (base) is committed to git; add `.env.*` to `.gitignore`.
- Document key rotation procedure in `readme.md`.

**Acceptance Criteria:**
- No secret keys are hardcoded in any `application.yaml` or source file.
- `.env.staging` and `.env.prod` point to separate Supabase projects.

---

### Story 8.3: Implement Docker Compose Overrides
**Sub-tasks:**
- `docker-compose.dev.yml` — exposes all service ports, enables Spring Boot DevTools.
- `docker-compose.staging.yml` — uses `env_file: .env.staging`.
- `docker-compose.prod.yml` — sets `mem_limit` and `cpus`, removes debug ports.

**Acceptance Criteria:**
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` runs in dev mode.
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` runs in prod mode.

---

### Story 8.4: Configure Frontend Multi-Mode Environments (Vite)
**Sub-tasks:**
- Create `Frontend/.env.development`, `Frontend/.env.staging`, `Frontend/.env.production`.
- Define `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL` for each.

**Acceptance Criteria:**
- `npx vite build --mode production` builds a bundle pointing to production API.
- `npx vite build --mode staging` builds a bundle pointing to staging API.

---

## Epic 9: Automated Testing & CI/CD
**Goal:** Add a safety net of tests and a CI pipeline to protect the system from regressions.

### Story 9.1: Set Up GitHub Actions CI Pipeline
**Sub-tasks:**
- Create `.github/workflows/ci.yml`.
- Pipeline jobs:
  1. For each service directory: `cd Backend/<service> && ./mvnw test`
  2. Build Docker image for each service.
  3. `cd Frontend && npm install && npm test`
- Add status badge to `readme.md`.

**Acceptance Criteria:**
- PR cannot be merged if any test step fails.
- Docker images build successfully in the pipeline.

---

### Story 9.2: Implement Backend Unit & Integration Tests
**Sub-tasks:**
- For each microservice, write:
  - At least 2 unit tests using JUnit 5 + Mockito for core service classes.
  - At least 1 integration test using `@SpringBootTest` for a controller endpoint.
- Add JaCoCo to each service `pom.xml` for coverage reporting.

**Acceptance Criteria:**
- `./mvnw test` passes for every service.
- JaCoCo coverage report is generated in `target/site/jacoco/`.

---

### Story 9.3: Implement Frontend Smoke Tests
**Sub-tasks:**
- Install Vitest: `npm install --save-dev vitest`.
- Add `"test": "vitest run"` to `package.json`.
- Write 3 tests covering `ApiService` methods (mock axios calls) and game state initialization.

**Acceptance Criteria:**
- `npm test` passes in the `Frontend/` directory.

---

## Epic 10: Cloud Deployment
**Goal:** Deploy the full microservices system to a cloud environment.

### Story 10.1: Push Images to Container Registry
**Sub-tasks:**
- Create a GitHub Container Registry (GHCR) or Docker Hub repository.
- Tag and push images for all 5 services + frontend.
- Commands:
  ```bash
  docker build -t ghcr.io/<username>/csd-gateway:latest ./gateway
  docker push ghcr.io/<username>/csd-gateway:latest
  # Repeat for all services
  ```

**Acceptance Criteria:**
- All 6 images are visible in the container registry.

---

### Story 10.2: Deploy to Cloud Platform
**Sub-tasks:**
- Deploy using one of:
  - **Option A (Simplest):** SSH to a VM (e.g., GCP e2-micro free tier), `git pull`, `docker compose up -d`.
  - **Option B (Recommended):** Deploy each service to Railway/Render using the Docker images.
- Set all environment variables via the platform dashboard (not `.env` files).
- Point a domain/IP to the Gateway container.

**Acceptance Criteria:**
- Application accessible via public URL through the Gateway on port `8080` (or `443` with TLS).
- Supabase database connection verified in the live environment.
- `GET /actuator/health` returns `UP` for all services.

---

### Story 10.3: Automate Deploy via CI/CD
**Sub-tasks:**
- Add a `deploy` job to `.github/workflows/ci.yml` triggered on merge to `main`.
- Job builds, tags, and pushes Docker images to the registry.
- Job triggers re-deployment on the cloud platform (via webhook or SSH command).
- Document the rollback procedure (re-deploy previous image tag).

**Acceptance Criteria:**
- Merge to `main` triggers an automatic deployment within 5 minutes.
- Deployment can be rolled back by re-running CI on a previous commit.
