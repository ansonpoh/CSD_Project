#!/bin/bash

# Build and Push Script for GHCR
# Usage: ./build-and-push.sh <github-username> <github-token>

set -e

GITHUB_USERNAME=${1:-$GHCR_USERNAME}
GITHUB_TOKEN=${2:-$GHCR_TOKEN}
REGISTRY="ghcr.io"
IMAGE_PREFIX="$REGISTRY/$GITHUB_USERNAME/csd-project"

if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_TOKEN" ]; then
    echo "Usage: $0 <github-username> <github-token>"
    echo "Or set GHCR_USERNAME and GHCR_TOKEN environment variables"
    exit 1
fi

# Login to GHCR
echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USERNAME" --password-stdin

# List of services to build
SERVICES=("identity-service" "game-service" "learning-service" "player-service" "gateway")

# Build and push each service
for SERVICE in "${SERVICES[@]}"; do
    echo ""
    echo "========================================="
    echo "Building and pushing: $SERVICE"
    echo "========================================="

    IMAGE_NAME="$IMAGE_PREFIX/$SERVICE"
    TAG="latest"

    # Build
    docker build -t "$IMAGE_NAME:$TAG" "./$SERVICE"

    # Push
    docker push "$IMAGE_NAME:$TAG"

    echo "✓ Pushed: $IMAGE_NAME:$TAG"
done

echo ""
echo "========================================="
echo "All images pushed successfully!"
echo "========================================="
echo "Images available at:"
for SERVICE in "${SERVICES[@]}"; do
    echo "  - $IMAGE_PREFIX/$SERVICE:latest"
done
