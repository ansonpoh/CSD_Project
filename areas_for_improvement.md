# Areas for Improvement - CSD Project

This document outlines key technical and architectural areas for improvement identified during the analysis of the project.

---

## 1. Backend: Version Standardization
*   **Observation:** There is a discrepancy in Spring Boot versions across microservices (e.g., `identity-service` uses `4.0.2` while `gateway` uses `3.4.3`).
*   **Risk:** Version mismatch can lead to inconsistent behavior, dependency conflicts, and maintenance overhead.
*   **Recommendation:** 
    *   Standardize all services to a stable Spring Boot release (e.g., `3.4.x`).
    *   Implement a shared **Maven Parent POM** or a **Bill of Materials (BOM)** to manage versions centrally.

## 2. Infrastructure: API Gateway Security
*   **Observation:** The Gateway's CORS configuration is currently set to `allowedOriginPatterns: '*'`.
*   **Risk:** This is highly insecure and vulnerable to Cross-Origin attacks in a production-like environment.
*   **Recommendation:** 
    *   Restrict `allowedOriginPatterns` to specific trusted domains (e.g., `http://localhost:3000`).
    *   Implement **Rate Limiting** at the Gateway level to protect downstream services from abuse or DDoS attempts.

## 3. Security: Authentication & RBAC Mapping
*   **Observation:** The system uses Supabase for Auth but implements Spring Security OAuth2 Resource Servers in individual services.
*   **Risk:** Inconsistent JWT validation or incorrect mapping of Supabase roles to Spring Security `GrantedAuthority` could lead to authorization bypass.
*   **Recommendation:** 
    *   Centralize JWT validation logic and ensure that the `JwtRoleConverter` in each service correctly maps Supabase's identity roles.
    *   Perform an audit of the `identity-service` to ensure consistent RBAC across all endpoints.

## 4. Performance: AI Service Latency
*   **Observation:** Real-time game elements (quizzes/narrations) rely on external OpenAI calls via `learning-service`.
*   **Risk:** AI latency (often >1s) can disrupt the game loop or cause "hanging" UI states during monster encounters.
*   **Recommendation:** 
    *   Implement a **caching strategy** in Redis for frequently generated AI content.
    *   Move AI generation to an **asynchronous/pre-generation** model where possible (e.g., pre-generate a pool of quizzes for a map).

## 5. Frontend: State Management & Decoupling
*   **Observation:** Phaser 3 game scenes appear to be directly coupled with `ApiService` calls.
*   **Risk:** Harder to test game logic in isolation and potential for "race conditions" if multiple scenes modify the same data via API.
*   **Recommendation:** 
    *   Decouple Phaser scenes from the API layer using a **Global State Manager** or a custom Event Bus.
    *   Ensure all API interactions go through a centralized service that updates a local state, which the scenes then observe.

## 6. Maintenance: Repository Cleanup
*   **Observation:** The legacy monolith (`csd/` folder) remains in the `Backend/` directory.
*   **Risk:** Increases repository size, build times, and causes confusion for new developers.
*   **Recommendation:** 
    *   Move the `csd/` folder to a dedicated `legacy` or `archive` branch.
    *   Remove it from the `main` branch once the microservices migration is verified as complete.

## 7. Testing: Coverage Gaps
*   **Observation:** While JUnit tests exist, the integration path between the Gateway and individual microservices is less covered.
*   **Risk:** "Integration bugs" (e.g., incorrect header forwarding or routing errors) may go undetected until deployment.
*   **Recommendation:** 
    *   Increase **Integration Testing** using `WebTestClient` or similar tools to verify end-to-end flows through the Gateway.
    *   Implement automated Frontend tests for critical paths like Login and Map loading.
