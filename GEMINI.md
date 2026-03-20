# GEMINI.md - Full Project Overview

## Project Mission
**CSD Project (Haro Group 4)** is an interactive, gamified learning platform designed to teach Computer Science and Software Development concepts. It features a rich 2D game world, AI-driven adaptive learning, and a robust microservices architecture.

---

## 🏗️ System Architecture

The project has transitioned from a monolith to a **decoupled microservices architecture** to ensure scalability, maintainability, and specialized scaling of AI and Game logic.

### 🌐 Frontend
- **Framework:** [Phaser 3](https://phaser.io/) (High-performance 2D Game Engine).
- **Build Tool:** [Vite](https://vitejs.dev/).
- **Auth & DB:** [Supabase](https://supabase.com/) (Client-side SDK for Auth/DB interaction).
- **Communication:** Axios-based `ApiService` routing through the Backend Gateway.

### ⚙️ Backend (Microservices)
Built with **Spring Boot 4.0.2** and **Java 21**, running in **Docker** containers.

| Service | Port | Description | Key Technologies |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `8080` | Entry point for all frontend requests. Handles routing and cross-cutting concerns. | Spring Cloud Gateway, Actuator |
| **Identity Service** | `8081` | Authentication, Authorization (RBAC), and User Role management. | Spring Security, OAuth2 Resource Server, Supabase Integration |
| **Game World Service**| `8082` | Manages game maps, NPCs, monsters, and player encounters. | Spring Data JPA, Redis (State), PostgreSQL |
| **Learning & AI** | `8083` | AI-driven quiz generation, content moderation, and adaptive learning paths. | **Spring AI (OpenAI GPT-4o-mini)**, PGVector |
| **Player & Economy** | `8084` | Learner profiles, inventory, items, leaderboards, and leveling logic. | Spring Data JPA, Redis (Leaderboards), PostgreSQL |

---

## 🛠️ Technology Stack

- **Backend:** Spring Boot 4.0.2, Java 21, Spring AI, Spring Cloud Gateway, Spring Security, Spring Data JPA.
- **Frontend:** Phaser 3, Vite, JavaScript (ES6+), Vanilla CSS.
- **Database:** PostgreSQL (with PGVector for AI), Redis (for Caching and Leaderboards).
- **Infrastructure:** Docker, Docker Compose, Supabase (Auth/Managed DB).
- **AI Models:** OpenAI GPT-4o-mini (via Spring AI).

---

## 📂 Project Structure

```text
CSD_Project/
├── Frontend/                # Phaser 3 Game Source
│   ├── src/
│   │   ├── characters/      # Sprites and Logic for Players/Monsters
│   │   ├── scenes/          # Game Scenes (Boot, Combat, WorldMap, etc.)
│   │   ├── services/        # ApiService and Game Logic services
│   │   └── config/          # Phaser and Supabase configuration
│   └── public/assets/       # Tilesets, Spritesheets, and Media
├── Backend/                 # Java Microservices
│   ├── gateway/             # Spring Cloud Gateway
│   ├── identity-service/    # Auth & Roles
│   ├── game-service/        # Maps, NPCs, Encounters
│   ├── learning-service/    # AI, Quizzes, Narrations
│   ├── player-service/      # Profiles, Economy, Leaderboards
│   ├── csd/                 # Legacy Monolith (Reference)
│   └── docker-compose.yml   # Local orchestration
└── GEMINI.md                # This file
```

---

## 🚀 Getting Started

### Prerequisites
- **Docker & Docker Compose**
- **Node.js (v18+)**
- **Java 21** (for local service development)
- A `.env` file in `Backend/` with the following:
  ```env
  SUPABASE_SERVER_PASSWORD=...
  SUPABASE_JWT_SECRET=...
  SUPABASE_URL=...
  SUPABASE_SERVICE_KEY=...
  OPENAI_API_KEY=...
  ```

### Running the Backend
```bash
cd Backend
docker compose up --build
```
*Gateway is available at `http://localhost:8080`.*

### Running the Frontend
```bash
cd Frontend
npm install
npm run dev
```
*Game is available at `http://localhost:3000` (configured in vite.config.js).*

---

## 📜 Development Conventions

1. **API Routing:** NEVER connect to services directly (e.g., `8081`). Always route through the Gateway (`8080/api/...`).
2. **AI Integration:** Centralized in `learning-service`. Use Spring AI starters for model interaction.
3. **Security:** Every request must carry a Bearer Token (JWT) from Supabase. The `identity-service` validates these tokens.
4. **Testing:** Run tests within each service directory: `./mvnw test`.
5. **State Management:** Critical game state is persisted in `game-service` and `player-service`. Transient state (like active encounters) is cached in **Redis**.

---

## 🎮 Game Features
- **Dynamic Map System:** Maps can be drafted, reviewed, and published by contributors.
- **AI Combat Quizzes:** Monster encounters trigger AI-generated quizzes based on learning topics.
- **Contributor Workflow:** Users can submit educational content, which is moderated by AI and approved by admins.
- **Economy & RPG Mechanics:** Earn currency, buy items, equip gear, and level up your learner profile.
