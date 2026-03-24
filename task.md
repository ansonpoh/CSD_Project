# DevSecOps 5-Day Deployment Plan

This document outlines the accelerated, actionable roadmap to secure, test, and deploy the CSD Project within 5 days, based on the finalized microservices architecture. It focuses on environment configuration, hardening, CI/CD, and cloud deployment.

> **Legend:** `[ ]` To Do · `[/]` In Progress · `[x]` Done

---

## 🎯 Day 1: Environment-Variable Driven Configuration

**Epic 8: Streamlined Environment Configuration**
*Objective: Ensure a single codebase and single set of config files can run in any environment (Dev/Staging/Prod) purely through environment variables.*

*   **Story 8.1: Safe Database Defaults**
    *   *As an Ops Lead, I want to prevent accidental database overwrites by setting safe default configurations in code.*
    *   [x] **Subtask:** Update `application.yaml` in all backend services to set `hibernate.ddl-auto: ${DB_DDL_AUTO:none}`.
    *   [x] **Subtask:** Update local `docker-compose.yml` to inject `DB_DDL_AUTO=update` only for local development.
    *   **Acceptance Criteria:**
        *   Starting the application without the `DB_DDL_AUTO` environment variable does not alter the database schema.
        *   Running `docker compose up` locally successfully updates the schema.

*   **Story 8.2: Streamline Frontend Configuration**
    *   *As a Developer, I want the Vite frontend to seamlessly connect to the correct backend API without needing multiple hardcoded config files.*
    *   [x] **Subtask:** Configure `vite.config.js` to rely on the environment variables provided by the build context or hosting platform.
    *   [x] **Subtask:** Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are read dynamically during the CI/CD build step.
    *   **Acceptance Criteria:**
        *   `npm run build` succeeds when environment variables are passed in the terminal.
        *   The built frontend points to the correct API Gateway URL based on the injected `VITE_API_BASE_URL`.

*   **Story 8.3: Local Secrets vs. Production Secrets**
    *   *As a Security Lead, I want to ensure developers use `.env` locally, but production relies on the Cloud Provider's Secret Manager.*
    *   [x] **Subtask:** Verify `.env` is explicitly ignored in all `.gitignore` files.
    *   [x] **Subtask:** Document in `readme.md` that production does NOT use a `.env` file, but instead requires variables to be injected via the PaaS (e.g., Render/Railway) dashboard.
    *   **Acceptance Criteria:**
        *   No `.env` file exists in the git history.
        *   The `readme.md` contains clear instructions on which environment variables must be configured in the cloud console.

---

## 🏗️ Day 2: Microservice Hardening & Resilience

**Epic 7: Microservice Hardening & Resilience**
*Objective: Add observability, resilience, and rate limiting now that the architecture is stable.*

*   **Story 7.1: Add Distributed Tracing (Observability)**
    *   *As an Ops Lead, I want to trace requests across the system to debug failures and latency.*
    *   [x] **Subtask:** Add `micrometer-tracing-bridge-brave` and `zipkin-reporter-brave` to the `pom.xml` of all 5 services.
    *   [x] **Subtask:** Configure `management.zipkin.tracing.endpoint` in `application.yaml` for each service.
    *   [x] **Subtask:** Add a Zipkin container to `docker-compose.yml` (`image: openzipkin/zipkin`, ports: `9411:9411`).
    *   **Acceptance Criteria:**
        *   Every log entry across all services includes a `traceId` and `spanId`.
        *   The Zipkin UI (`localhost:9411`) shows a full request trace spanning from the Gateway to the backend services.

*   **Story 7.2: Implement Circuit Breaker (Game Service)**
    *   *As an Ops Lead, I want the Gateway to handle Game Service failures gracefully.*
    *   [x] **Subtask:** Add `spring-cloud-starter-circuitbreaker-reactor-resilience4j` to the `gateway` `pom.xml`.
    *   [x] **Subtask:** Configure a circuit breaker filter for `game-service` routes in `gateway/application.yaml`.
    *   [x] **Subtask:** Define a fallback controller in the Gateway to return a structured `503` error.
    *   **Acceptance Criteria:**
        *   When the `game-service` container is stopped, requests to game routes return a graceful `503 Service Unavailable` JSON response from the Gateway instead of a connection timeout error.

*   **Story 7.3: Implement Rate Limiting (AI Endpoints)**
    *   *As a Security Lead, I want to protect OpenAI endpoints from abuse and cost overruns.*
    *   [x] **Subtask:** Add `spring-cloud-starter-gateway` rate limiter filter (using Redis) to the Gateway.
    *   [x] **Subtask:** Configure `RequestRateLimiter` filter on `/api/ai/**` routes.
    *   [x] **Subtask:** Set `redis-rate-limiter.replenishRate` and `burstCapacity` in `gateway/application.yaml`.
    *   **Acceptance Criteria:**
        *   Sending rapid requests (exceeding the burst capacity) to `/api/ai/**` returns a `429 Too Many Requests` status code.
        *   The rate limit is enforced by Redis.

---

## 📦 Day 3: Automated Testing & CI/CD

**Epic 9: Automated Testing & CI/CD**
*Objective: Add a safety net of tests and a CI pipeline to protect the system from regressions.*

*   **Story 9.1: Set Up GitHub Actions CI Pipeline**
    *   *As a Developer, I want automated verification of my code on every pull request.*
    *   [ ] **Subtask:** Create `.github/workflows/ci.yml`.
    *   [ ] **Subtask:** Add jobs to run `./mvnw test` for all backend services.
    *   [ ] **Subtask:** Add a job to build Docker images for each service to ensure they compile.
    *   [ ] **Subtask:** Add a job to run `npm install && npm test` (or build) for the Frontend.
    *   [ ] **Subtask:** Add a security scanning step: `trivy image` for Docker images and `npm audit` for Frontend dependencies.
    *   [ ] **Subtask:** Configure GitHub branch protection rules on `main` to require the CI workflow to pass before merging.
    *   **Acceptance Criteria:**
        *   Opening a Pull Request against `main` automatically triggers the workflow.
        *   The PR is blocked from merging if any of the workflow jobs (tests or builds) fail.

*   **Story 9.2: Implement Backend Unit & Integration Tests**
    *   *As a Developer, I want to ensure my service logic is sound.*
    *   [ ] **Subtask:** Write at least 2 unit tests (JUnit 5 + Mockito) for core service classes in each microservice.
    *   [ ] **Subtask:** Write at least 1 integration test (`@SpringBootTest`) for a critical controller endpoint in each microservice.
    *   [ ] **Subtask:** Add the JaCoCo plugin to each service's `pom.xml` for coverage reporting.
    *   **Acceptance Criteria:**
        *   `./mvnw test` passes in all 5 service directories.
        *   JaCoCo generates an HTML coverage report in the `target/site/jacoco` directory for each service.

*   **Story 9.3: Implement Frontend Smoke Tests**
    *   *As a Developer, I want basic assurance that the frontend loads and connects to the API.*
    *   [ ] **Subtask:** Install Vitest in `Frontend/` (`npm install --save-dev vitest`).
    *   [ ] **Subtask:** Write basic smoke tests covering `ApiService` initialization or component rendering.
    *   **Acceptance Criteria:**
        *   Running `npm test` successfully executes the Vitest suite without errors.

---

## ☁️ Day 4: Artifact Management & Cloud Provisioning

**Epic 10: Cloud Deployment (Part 1)**
*Objective: Prepare artifacts and cloud infrastructure for the final deployment.*

*   **Story 10.1: Push Images to Container Registry**
    *   *As an Ops Lead, I need a centralized location for production-ready images.*
    *   [ ] **Subtask:** Set up a GitHub Container Registry (GHCR) or Docker Hub repository.
    *   [ ] **Subtask:** Build and tag all 5 backend services + the gateway locally.
    *   [ ] **Subtask:** Push the images to the registry.
    *   **Acceptance Criteria:**
        *   All 6 backend images (5 services + 1 gateway) are successfully hosted and accessible in the remote container registry.

*   **Story 10.2: Provision Cloud Resources & Configure Secrets**
    *   *As an Ops Lead, I need the target environment prepared for deployment.*
    *   [ ] **Subtask:** Provision the hosting environment (e.g., VMs on GCP/AWS, or a PaaS like Render/Railway).
    *   [ ] **Subtask:** Provision a **managed Redis instance** (e.g., Redis Cloud, AWS ElastiCache, or Render Redis) with AOF persistence enabled. A standalone Redis container without persistence is not acceptable for production.
    *   [ ] **Subtask:** Inject production secrets (`SUPABASE_JWT_SECRET`, `OPENAI_API_KEY`, DB credentials) into the cloud provider's environment variables dashboard.
    *   **Acceptance Criteria:**
        *   The cloud environment has available compute resources.
        *   The managed Redis instance is accessible.
        *   All necessary secrets are populated in the platform's UI, completely separate from the git repository.

---

## 🚦 Day 5: Deployment, Automation & Go-Live

**Epic 10: Cloud Deployment (Part 2)**
*Objective: Deploy the system, automate future deployments, and verify functionality.*

*   **Story 10.3: Deploy to Cloud Platform**
    *   *As an Ops Lead, I want the system live and accessible.*
    *   [ ] **Subtask:** Pull the latest Docker images to the production environment and start the services (`docker compose up -d` or via PaaS deployment).
    *   [ ] **Subtask:** Deploy the Vite Frontend to **Vercel**: connect the repo, set the root directory to `Frontend/`, configure build command `npm run build` and output directory `dist`.
    *   [ ] **Subtask:** Set Vercel environment variables: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
    *   [ ] **Subtask:** Configure **CORS** on the API Gateway to allow requests from the Vercel production domain.
    *   [ ] **Subtask:** Provision TLS certificates (e.g., via Let's Encrypt or the cloud provider's managed certificates) for the Gateway domain.
    *   [ ] **Subtask:** Verify the Gateway is accessible over HTTPS (port 443).
    *   **Acceptance Criteria:**
        *   The backend is fully operational and accessible via the public Gateway URL.
        *   The frontend is live, loads securely over HTTPS, and successfully communicates with the Gateway API.

*   **Story 10.4: Automate Deploy via CI/CD**
    *   *As an Ops Lead, I want merges to `main` to deploy automatically.*
    *   [ ] **Subtask:** Add a `deploy` job to `.github/workflows/ci.yml` that triggers on merge to `main`.
    *   [ ] **Subtask:** Configure the job to build, tag, and push new Docker images.
    *   [ ] **Subtask:** Configure a webhook or SSH command in the pipeline to trigger the cloud environment to pull the new images and restart.
    *   **Acceptance Criteria:**
        *   Merging a PR to `main` results in an automatic deployment to the cloud environment within 5 minutes, requiring no manual intervention.

*   **Story 10.5: Final System Verification (Smoke Test)**
    *   *As the Team, we must ensure production works identically to local.*
    *   [ ] **Subtask:** Verify `GET /actuator/health` returns `UP` for all live services via the Gateway.
    *   [ ] **Subtask:** Perform a full user journey: Login, load a map, trigger a monster encounter (AI test), and view the leaderboard.
    *   [ ] **Subtask:** Sign off and distribute the live URL.
    *   **Acceptance Criteria:**
        *   All health checks pass.
        *   A real user can successfully complete the core game loop on the live production URL.

*   **Story 10.6: Rollback & Failure Strategy**
    *   *As an Ops Lead, I want a documented rollback plan so the team can recover quickly from a failed deployment.*
    *   [ ] **Subtask:** Tag the current working Docker images as `:stable` before pushing any new images.
    *   [ ] **Subtask:** Document a step-by-step rollback runbook: how to revert to the `:stable` tagged images and restart services.
    *   [ ] **Subtask:** Verify the rollback process works by simulating a failed deploy and recovering.
    *   **Acceptance Criteria:**
        *   Every deployment tags the previous known-good images as `:stable`.
        *   The team can roll back to a working state within 10 minutes using the documented runbook.
