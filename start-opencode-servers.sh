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

echo "Starting OpenCode backend for customer-service on :4001"
(
  cd "$ROOT_DIR/customer-service"
  exec opencode serve --port 4001
) &
PIDS+=("$!")

echo "Starting OpenCode backend for order-service on :4002"
(
  cd "$ROOT_DIR/order-service"
  exec opencode serve --port 4002
) &
PIDS+=("$!")

echo "OpenCode backends are running. Press Ctrl-C to stop both."
wait "${PIDS[@]}"
