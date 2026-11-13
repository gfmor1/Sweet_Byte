#!/usr/bin/env bash
# Starts the backend and the frontend in one container.
# If either one stops, the container stops too, so Docker reports it (and can restart it).
set -uo pipefail

java ${JAVA_OPTS:-} -jar /app/backend/app.jar &
backend=$!

(cd /app/frontend && exec node_modules/.bin/next start -p 3001) &
frontend=$!

# forward docker stop (SIGTERM) to both
trap 'kill -TERM "$backend" "$frontend" 2>/dev/null; wait' TERM INT

status=0
wait -n "$backend" "$frontend" || status=$?
echo "A SweetByte process exited (status $status); stopping the container." >&2
kill -TERM "$backend" "$frontend" 2>/dev/null || true
wait || true
exit "$status"
