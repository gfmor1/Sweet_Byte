#!/usr/bin/env bash
# Builds and runs backend (:8080) and frontend (:3001). Usage: scripts/build-local.sh [--build-only]
set -euo pipefail
cd "$(dirname "$0")/.."

(cd backend && ./mvnw -B -DskipTests clean package)
(cd FrontEnd && npm ci && npm run build)

[ "${1:-}" = "--build-only" ] && exit 0
trap 'kill 0' EXIT
(cd backend && java -jar target/*.jar) &
(cd FrontEnd && npm start) &
wait
