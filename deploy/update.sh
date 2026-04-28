#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found in PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required but was not found." >&2
  exit 1
fi

if [[ ! -f ".env" ]]; then
  echo "Missing .env in ${REPO_ROOT}. Create .env with production values first." >&2
  exit 1
fi

PROMPT_AGENT_BACKUP_KIND=preupdate "${REPO_ROOT}/deploy/backup.sh"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Working tree has uncommitted changes. Aborting deployment update." >&2
    exit 1
  fi

  git pull --ff-only
fi

docker compose --profile ops build app schema
docker compose --profile ops run --rm schema
docker compose up -d --wait app
docker compose ps
