#!/usr/bin/env bash

# Restore the prompt-agent SQLite database from a backup file.
# Mirrors prompt-ide/deploy/restore.sh contract.
#
# Usage:
#   ./deploy/restore.sh /srv/prompt-agent-backups/preupdate-2026-04-28-053100.db

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_SERVICE="app"
SCHEMA_SERVICE="schema"
DB_PATH="/app/data/prompt-agent.db"

APP_WAS_RUNNING=0
APP_STOPPED=0

cd "${REPO_ROOT}"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-file>" >&2
  echo "Example: $0 /srv/prompt-agent-backups/preupdate-2026-04-28-053100.db" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "${cmd} is required but was not found in PATH." >&2
    exit 1
  fi
}

require_command docker

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required but was not found." >&2
  exit 1
fi

if [[ ! -f ".env" ]]; then
  echo "Missing .env in ${REPO_ROOT}." >&2
  exit 1
fi

app_is_running() {
  [[ -n "$(docker compose ps --status running -q "${APP_SERVICE}" 2>/dev/null || true)" ]]
}

restart_app_if_needed() {
  if [[ "${APP_WAS_RUNNING}" -eq 1 ]]; then
    docker compose start "${APP_SERVICE}" >/dev/null
    APP_STOPPED=0
  fi
}

on_error() {
  local exit_code="$1"
  if [[ "${exit_code}" -ne 0 && "${APP_STOPPED}" -eq 1 && "${APP_WAS_RUNNING}" -eq 1 ]]; then
    echo "Restore failed. Attempting to restart ${APP_SERVICE}..." >&2
    docker compose start "${APP_SERVICE}" >/dev/null 2>&1 || true
  fi
  exit "${exit_code}"
}

trap 'on_error "$?"' EXIT

# Confirm
echo "About to restore ${BACKUP_FILE} -> ${DB_PATH} inside container volume."
echo "This will OVERWRITE the current database. Press Ctrl-C in 5s to abort..."
sleep 5

if app_is_running; then
  APP_WAS_RUNNING=1
  docker compose stop "${APP_SERVICE}"
  APP_STOPPED=1
fi

BACKUP_DIR="$(cd "$(dirname "${BACKUP_FILE}")" && pwd)"
BACKUP_NAME="$(basename "${BACKUP_FILE}")"

docker compose run --rm --no-deps \
  -v "${BACKUP_DIR}:/backup:ro" \
  "${SCHEMA_SERVICE}" \
  sh -lc "cp '/backup/${BACKUP_NAME}' '${DB_PATH}'"

restart_app_if_needed

trap - EXIT

echo "Restored ${BACKUP_FILE} into ${DB_PATH}"
