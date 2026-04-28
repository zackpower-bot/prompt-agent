#!/usr/bin/env bash

# Backup the prompt-agent SQLite database before/around deploys.
# Mirrors prompt-ide/deploy/backup.sh contract.
#
# Usage:
#   PROMPT_AGENT_BACKUP_KIND=preupdate ./deploy/backup.sh
#   PROMPT_AGENT_BACKUP_KIND=daily    ./deploy/backup.sh
#   PROMPT_AGENT_BACKUP_KIND=manual   ./deploy/backup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${PROMPT_AGENT_BACKUP_DIR:-/srv/prompt-agent-backups}"
BACKUP_KIND="${PROMPT_AGENT_BACKUP_KIND:-daily}"
APP_SERVICE="app"
SCHEMA_SERVICE="schema"
DB_PATH="/app/data/prompt-agent.db"

APP_WAS_RUNNING=0
APP_STOPPED=0

cd "${REPO_ROOT}"

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "${cmd} is required but was not found in PATH." >&2
    exit 1
  fi
}

prepare_backup_dir() {
  mkdir -p "${BACKUP_DIR}"
  chmod 0750 "${BACKUP_DIR}"
}

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
    echo "Backup failed after stopping the app. Attempting to restart ${APP_SERVICE}..." >&2
    docker compose start "${APP_SERVICE}" >/dev/null 2>&1 || true
  fi
  exit "${exit_code}"
}

trap 'on_error "$?"' EXIT

require_command docker

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required but was not found." >&2
  exit 1
fi

if [[ ! -f ".env" ]]; then
  echo "Missing .env in ${REPO_ROOT}. The deployment environment must already be configured." >&2
  exit 1
fi

case "${BACKUP_KIND}" in
  daily|preupdate|manual)
    ;;
  *)
    echo "Unsupported PROMPT_AGENT_BACKUP_KIND: ${BACKUP_KIND}. Expected daily, preupdate, or manual." >&2
    exit 1
    ;;
esac

prepare_backup_dir

if app_is_running; then
  APP_WAS_RUNNING=1
  docker compose stop "${APP_SERVICE}"
  APP_STOPPED=1
fi

STAMP="$(date +%F-%H%M%S)"
BACKUP_NAME="${BACKUP_KIND}-${STAMP}.db"

docker compose run --rm --no-deps \
  -v "${BACKUP_DIR}:/backup" \
  "${SCHEMA_SERVICE}" \
  sh -lc "test -f '${DB_PATH}' && cp '${DB_PATH}' '/backup/${BACKUP_NAME}'"

restart_app_if_needed

if [[ "${BACKUP_KIND}" == "daily" ]]; then
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'daily-*.db' -mtime +7 -delete
fi

trap - EXIT

echo "Created ${BACKUP_KIND} backup at ${BACKUP_DIR}/${BACKUP_NAME}"
