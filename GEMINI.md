# GEMINI.md

## Project Overview
This is a full-stack game development project (Haro Group 4) featuring a Phaser-based frontend and a Spring Boot backend integrated with AI capabilities.

- **Frontend:** Built with [Phaser 3](https://phaser.io/) and [Vite](https://vitejs.dev/). It uses [Supabase](https://supabase.com/) for client-side authentication and database interactions.
- **Backend:** A [Spring Boot](https://spring.io/projects/spring-boot) (v4.0.2) application using Java 21. It integrates [Spring AI](https://spring.io/projects/spring-ai) (OpenAI GPT-4o-mini), [Spring Security](https://spring.io/projects/spring-security) with OAuth2/JWT (via Supabase), [Spring Data JPA](https://spring.io/projects/spring-data-jpa) (PostgreSQL), and [Redis](https://redis.io/).
- **Architecture:** The game logic is primarily in the frontend scenes, while the backend provides AI-driven features (like scenario-based quizzes) and potentially more complex game state management.

## Project Structure
- `CSD_Project/Frontend`: Phaser game source code, assets, and Vite configuration.
- `CSD_Project/Backend`: Docker configuration and the `csd` Spring Boot application.
- `Class Lecture Slides & Activities`: Supporting course materials.

## Building and Running

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd CSD_Project/Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend
1. Navigate to the backend directory:
   ```bash
   cd CSD_Project/Backend
   ```
2. Start the services using Docker Compose:
   ```bash
   docker compose up --build
   ```
   *Note: Ensure Docker is running. The server will be accessible at `localhost:8080`.*
3. Run tests using Maven:
   ```bash
   cd csd
   ./mvnw test
   ```
4. API Documentation (Swagger UI):
   Available at `http://localhost:8080/swagger-ui.html` when the server is running.

### Environment Variables
The backend requires several environment variables for full functionality (refer to `application.yaml`):
- `SUPABASE_SERVER_PASSWORD`
- `OPENAI_API_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Development Conventions
- **Backend:**
  - **Language:** Java 21.
  - **Framework:** Spring Boot 4.0.x.
  - **Lombok:** Used to reduce boilerplate (requires annotation processing enabled in IDE).
  - **Testing:** JUnit/Spring Boot Test.
- **Frontend:**
  - **Framework:** Phaser 3.
  - **Module System:** ES Modules.
  - **Styling:** Vanilla CSS.
- **AI Integration:** Uses Spring AI with OpenAI models for intelligent game features.
