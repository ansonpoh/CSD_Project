# CSD Project - Haro Group 4

## Project Mission
**CSD Project** is an interactive, gamified learning platform designed to teach Computer Science and Software Development concepts.

---

## 🚀 Getting Started

### Prerequisites
- **Docker & Docker Compose**
- **Node.js (v18+)**
- **Java 21**

### 🔐 Environment Configuration

This project relies on environment variables for security and portability. 

#### Local Development
1. **Backend:** Create a `.env` file in the `Backend/` directory:
   ```env
   SUPABASE_SERVER_PASSWORD=your_password
   SUPABASE_JWT_SECRET=your_jwt_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   OPENAI_API_KEY=your_openai_api_key
   ```
2. **Frontend:** Create a `.env` file in the `Frontend/` directory (see `.env.example`):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_BASE_URL=http://localhost:8080
   ```

> **Note:** `.env` files are explicitly ignored by git to prevent secrets from being committed. Never commit a `.env` file.

#### Production Deployment
Production environments (e.g., Render, Railway, AWS) do **NOT** use `.env` files. Instead:
- All secrets must be injected via the Cloud Provider's **Environment Variables / Secrets Manager** dashboard.
- The `DB_DDL_AUTO` variable should be omitted or set to `none` in production to prevent schema loss.
- Ensure `VITE_API_BASE_URL` in the frontend build points to the production Gateway URL.

---

## 🏗️ Running the System

### Backend
1. Navigate to the backend folder:
   ```bash
   cd Backend
   ```
2. Start the services:
   ```bash
   docker compose up --build
   ```
3. Access API Documentation (Swagger UI) at: `http://localhost:8080/swagger-ui.html`

### Frontend
1. Navigate to the frontend folder:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The game is available at `http://localhost:3000`.*
