# Production Rollback Runbook

## Goal

Restore the last known-good backend release in under 10 minutes.

## Preconditions

- Each backend image has a `stable` tag in GHCR.
- Render services are configured to deploy from GHCR images.
- The current gateway URL is known.

## Rollback Steps

1. Identify the impacted services.
2. In Render, change each affected service image tag from the current release tag to `stable`.
3. Redeploy the affected services.
4. Redeploy `gateway` last if an upstream service dependency changed.
5. Run the production smoke test:
   - `GATEWAY_URL=<prod-gateway-url> ./scripts/smoke-test-production.sh`
6. Verify the core learner journey again.

## Stable Tag Policy

- Before publishing a new `latest`, the deploy workflow promotes the existing `latest` image to `stable`.
- If there is no previous `latest`, no `stable` tag is created on the first release.

## Failure Signals That Require Rollback

- `/actuator/health` fails after deployment
- gateway cannot reach one or more internal services
- login or critical learner flow is broken
- AI-dependent endpoints fail consistently after release

## Verification After Rollback

- Gateway health is `UP`
- Each affected service is `UP`
- Frontend can reach the gateway
- One real user flow completes successfully
