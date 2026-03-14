# Microservices "Big Bang" Migration Plan

This document outlines the steps to split the `csd` monolith into 5 microservices locally.

**Pre-requisites:**
- Java 21 installed.
- Maven installed.
- Docker & Docker Compose installed.

---

## Phase 1: Project Initialization

1.  **Create 5 New Directories** in `Backend/`:
    - `gateway`
    - `identity-service`
    - `game-service`
    - `learning-service`
    - `player-service`

2.  **Initialize Spring Boot Projects:**
    - Run `spring init` or use [start.spring.io](https://start.spring.io) to generate a basic project for each service.
    - **Dependencies:** Web, Security, JPA, PostgreSQL, Redis, Lombok, Validation.
    - **Gateway Dependencies:** Gateway, Reactive Web (WebFlux), Eureka Client (optional, skip for now).

3.  **Copy `pom.xml` Settings:**
    - Copy the `<dependencies>` and `<properties>` from `csd/pom.xml` to each new service's `pom.xml`.
    - **Crucial:** Ensure `spring-boot-starter-parent` version matches (4.0.2).

---

## Phase 2: Infrastructure & Shared Code (The "Glue")

**Action:** Copy the following packages from `csd/src/main/java/com/smu/csd/` to **ALL 4 Services** (Identity, Game, Learning, Player):

1.  `config/` (SecurityConfig, DotenvConfig)
2.  `security/` (JwtConverters)
3.  `exception/` (GlobalExceptionHandler)
4.  `redis/` (Only for Game & Player services)

**Why?** Every service needs to authenticate users and handle errors consistently.

---

## Phase 3: Domain Migration (The "Meat")

Move the specific domain packages to their respective services:

### A. Identity Service (`identity-service`)
- **Port:** `8081`
- **Packages to Move:**
    - `auth/`
    - `roles/`
- **Database:** Needs `users`, `roles` tables.

### B. Game World Service (`game-service`)
- **Port:** `8082`
- **Packages to Move:**
    - `maps/`
    - `npcs/`
    - `monsters/`
    - `animations/`
    - `encounters/`
- **Database:** Needs `maps`, `npcs`, `monsters` tables.

### C. Learning & AI Service (`learning-service`)
- **Port:** `8083`
- **Packages to Move:**
    - `quiz/`
    - `ai/`
    - `contents/`
- **Database:** Needs `contents` (vector store) tables.

### D. Player & Economy Service (`player-service`)
- **Port:** `8084`
- **Packages to Move:**
    - `economy/`
    - `leaderboard/`
- **Database:** Needs `learners`, `items`, `inventory` tables.

---

## Phase 4: Configuration & Gateway

1.  **Configure `application.yaml` for each service:**
    - Set `server.port` (8081, 8082, 8083, 8084).
    - Set `spring.application.name`.
    - Configure Database URL (all can point to the same Supabase DB for now, but strictly separate schemas is better).

2.  **Configure Gateway (`gateway`):**
    - **Port:** `8080` (Matches original monolith so Frontend doesn't need changes).
    - **Routes:**
        ```yaml
        spring:
          cloud:
            gateway:
              routes:
                - id: identity-service
                  uri: http://identity-service:8081
                  predicates:
                    - Path=/api/auth/**
                - id: game-service
                  uri: http://game-service:8082
                  predicates:
                    - Path=/api/maps/**, /api/npcs/**, /api/monsters/**
                - id: learning-service
                  uri: http://learning-service:8083
                  predicates:
                    - Path=/api/quizzes/**, /api/ai/**
                - id: player-service
                  uri: http://player-service:8084
                  predicates:
                    - Path=/api/economy/**, /api/leaderboard/**
        ```

---

## Phase 5: Orchestration

1.  **Update `docker-compose.yml`:**
    - Define services for `gateway`, `identity-service`, `game-service`, `learning-service`, `player-service`.
    - Ensure `gateway` depends on the others.
    - Remove the `csd` (monolith) service.

2.  **Run & Test:**
    - `docker-compose up --build`
    - Verify all 5 containers start.
    - Test Frontend (it should talk to Gateway on 8080, which routes to services).

---

## Verification Checklist

- [ ] All 5 services have `pom.xml` and build successfully (`mvn clean install`).
- [ ] `gateway` is running on port 8080.
- [ ] `identity-service` is running on 8081.
- [ ] `game-service` is running on 8082.
- [ ] `learning-service` is running on 8083.
- [ ] `player-service` is running on 8084.
- [ ] Frontend can login (hits Identity).
- [ ] Frontend loads map (hits Game).
- [ ] Frontend starts quiz (hits Learning).
