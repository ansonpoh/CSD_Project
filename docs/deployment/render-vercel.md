# Render + Vercel Deployment Guide

This repository is prepared for a split production setup:

- Frontend: Vercel
- Backend services: Render
- Redis: Render Key Value or another managed Redis provider
- Container registry: GHCR

## Runtime Targets

| Component | Target | Public? | Health Check |
| --- | --- | --- | --- |
| `gateway` | Render Web Service | Yes | `/actuator/health` |
| `identity-service` | Render Web Service | No | `/actuator/health` |
| `game-service` | Render Web Service | No | `/actuator/health` |
| `learning-service` | Render Web Service | No | `/actuator/health` |
| `player-service` | Render Web Service | No | `/actuator/health` |
| `redis` | Render Key Value | No | managed by provider |
| `Frontend/` | Vercel Project | Yes | Vercel deployment URL |

## Image Strategy

Publish backend images to:

- `ghcr.io/ansonpoh/csd-project/identity-service`
- `ghcr.io/ansonpoh/csd-project/game-service`
- `ghcr.io/ansonpoh/csd-project/learning-service`
- `ghcr.io/ansonpoh/csd-project/player-service`
- `ghcr.io/ansonpoh/csd-project/gateway`

Tags:

- `latest`: current production candidate
- `<git-sha>`: immutable release tag
- `stable`: last known-good production image

## Production Environment Inventory

### Shared secrets

| Variable | Used by |
| --- | --- |
| `SUPABASE_SERVER_PASSWORD` | identity, game, learning, player |
| `SUPABASE_JWT_SECRET` | identity, game, learning, player |
| `SUPABASE_URL` | identity, game, learning, player, chatbot |
| `SUPABASE_SERVICE_KEY` | identity, game, learning, player, chatbot |
| `OPENAI_API_KEY` | learning, chatbot |

### Gateway

| Variable | Example / Notes |
| --- | --- |
| `IDENTITY_URL` | Render internal URL for identity-service |
| `GAME_URL` | Render internal URL for game-service |
| `LEARNING_SERVICE_URL` | Render internal URL for learning-service |
| `PLAYER_SERVICE_URL` | Render internal URL for player-service |
| `REDIS_HOST` | managed Redis host |
| `REDIS_PORT` | managed Redis port |
| `ZIPKIN_URL` | optional tracing endpoint |
| `CORS_ALLOWED_ORIGINS` | Vercel production domain, preview domain if desired |

### identity-service

| Variable | Example / Notes |
| --- | --- |
| `DB_DDL_AUTO` | omit or set `none` in production |
| `GAME_URL` | Render internal URL |
| `LEARNING_SERVICE_URL` | Render internal URL |
| `PLAYER_SERVICE_URL` | Render internal URL |
| `ZIPKIN_URL` | optional tracing endpoint |

### game-service

| Variable | Example / Notes |
| --- | --- |
| `DB_DDL_AUTO` | omit or set `none` in production |
| `REDIS_HOST` | managed Redis host |
| `REDIS_PORT` | managed Redis port |
| `IDENTITY_URL` | Render internal URL |
| `LEARNING_URL` | Render internal URL |
| `PLAYER_SERVICE_URL` | Render internal URL |
| `ZIPKIN_URL` | optional tracing endpoint |

### learning-service

| Variable | Example / Notes |
| --- | --- |
| `DB_DDL_AUTO` | omit or set `none` in production |
| `IDENTITY_URL` | Render internal URL |
| `GAME_URL` | Render internal URL |
| `PLAYER_SERVICE_URL` | Render internal URL |
| `CHATBOT_URL` | chatbot base URL |
| `ZIPKIN_URL` | optional tracing endpoint |

### player-service

| Variable | Example / Notes |
| --- | --- |
| `DB_DDL_AUTO` | omit or set `none` in production |
| `REDIS_HOST` | managed Redis host |
| `REDIS_PORT` | managed Redis port |
| `IDENTITY_URL` | Render internal URL |
| `GAME_URL` | Render internal URL |
| `LEARNING_SERVICE_URL` | Render internal URL |
| `ZIPKIN_URL` | optional tracing endpoint |

### Frontend

| Variable | Example / Notes |
| --- | --- |
| `VITE_API_BASE_URL` | public gateway URL |
| `VITE_SUPABASE_URL` | public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | public anon key |

## Render Setup

1. Create five Render web services, one for each backend service.
2. Use the corresponding GHCR image for each service.
3. Configure the container port to match each service's Spring port.
4. Set the health check path to `/actuator/health`.
5. Mark only `gateway` as publicly reachable.
6. Use Render internal service URLs for service-to-service communication.
7. Provision managed Redis and attach its host and port to the services that require it.

## Vercel Setup

1. Connect the repository to Vercel.
2. Set the root directory to `Frontend/`.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Add `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.

## Manual Go-Live Checklist

1. Push images to GHCR.
2. Point each Render service to the new image tag.
3. Confirm all backend health endpoints return `UP`.
4. Deploy the frontend on Vercel with the production gateway URL.
5. Run `scripts/smoke-test-production.sh` against the live gateway.
6. Verify one real learner flow end to end.
