#!/bin/bash

# Build and Push Script for GHCR
# Usage: ./build-and-push.sh <github-username> <github-token> [release-sha]

set -e

GITHUB_USERNAME=${1:-$GHCR_USERNAME}
GITHUB_TOKEN=${2:-$GHCR_TOKEN}
RELEASE_SHA=${3:-${GITHUB_SHA:-manual}}
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
    LATEST_TAG="latest"
    SHA_TAG="$RELEASE_SHA"

    if docker manifest inspect "$IMAGE_NAME:$LATEST_TAG" >/dev/null 2>&1; then
        docker buildx imagetools create -t "$IMAGE_NAME:stable" "$IMAGE_NAME:$LATEST_TAG"
        echo "✓ Promoted existing $IMAGE_NAME:$LATEST_TAG to :stable"
    else
        echo "• No existing latest tag for $IMAGE_NAME; skipping stable promotion"
    fi

    # Build
    docker build -t "$IMAGE_NAME:$LATEST_TAG" -t "$IMAGE_NAME:$SHA_TAG" "./$SERVICE"

    # Push
    docker push "$IMAGE_NAME:$LATEST_TAG"
    docker push "$IMAGE_NAME:$SHA_TAG"

    echo "✓ Pushed: $IMAGE_NAME:$LATEST_TAG"
    echo "✓ Pushed: $IMAGE_NAME:$SHA_TAG"
done

echo ""
echo "========================================="
echo "All images pushed successfully!"
echo "========================================="
echo "Images available at:"
for SERVICE in "${SERVICES[@]}"; do
    echo "  - $IMAGE_PREFIX/$SERVICE:latest"
    echo "  - $IMAGE_PREFIX/$SERVICE:$RELEASE_SHA"
done
