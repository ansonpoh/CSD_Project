#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${GATEWAY_URL:-}" ]]; then
  echo "GATEWAY_URL is required"
  exit 1
fi

health_url="${GATEWAY_URL%/}/actuator/health"

echo "Checking gateway health at ${health_url}"
health_response="$(curl -fsSL "${health_url}")"
echo "${health_response}" | grep -q '"status":"UP"'

echo "Gateway health check passed."

if [[ -n "${FRONTEND_ORIGIN:-}" ]]; then
  echo "Checking gateway reachability from frontend origin ${FRONTEND_ORIGIN}"
  cors_headers="$(curl -fsSI -H "Origin: ${FRONTEND_ORIGIN}" "${health_url}")"
  echo "${cors_headers}" | grep -Eiq 'access-control-allow-origin|vary: origin' || {
    echo "Expected CORS headers were not observed."
    exit 1
  }
  echo "CORS header check passed."
fi
