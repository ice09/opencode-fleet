#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS=()

cleanup() {
  if [ ${#PIDS[@]} -gt 0 ]; then
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting customer-service on :8081"
(
  cd "$ROOT_DIR/customer-service"
  exec ./gradlew bootRun
) &
PIDS+=("$!")

echo "Starting order-service on :8082"
(
  cd "$ROOT_DIR/order-service"
  exec ./gradlew bootRun
) &
PIDS+=("$!")

echo "Spring Boot apps are running. Press Ctrl-C to stop both."
wait "${PIDS[@]}"
