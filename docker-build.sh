#!/bin/bash
# Fast Docker build script using classic builder (no BuildKit OCI export)

# Disable BuildKit for fast local builds
export COMPOSE_DOCKER_CLI_BUILD=0
export DOCKER_BUILDKIT=0

echo "🚀 Building with classic Docker builder (fast mode)..."
echo ""

# Check if a service name was provided
if [ -z "$1" ]; then
    echo "Building all services..."
    docker compose build "$@"
else
    echo "Building service: $1"
    docker compose build "$@"
fi

echo ""
echo "✅ Build complete! No OCI export delays."
