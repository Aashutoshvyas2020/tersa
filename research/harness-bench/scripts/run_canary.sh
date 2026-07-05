#!/usr/bin/env bash
set -euo pipefail

command -v docker >/dev/null || {
  echo "Docker is required." >&2
  exit 1
}
docker info >/dev/null

if [[ -z "${ANTHROPIC_API_KEY:-}" && -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]]; then
  echo "Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN." >&2
  exit 1
fi

uv run python scripts/validate_configs.py
uv run python scripts/verify_skill_sources.py
uv run harbor run --config configs/canary-profiles-claude.yaml --yes
