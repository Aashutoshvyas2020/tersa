#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 configs/<config>.yaml" >&2
  exit 2
fi

config="$1"
[[ -f "$config" ]] || {
  echo "Config not found: $config" >&2
  exit 2
}

uv run python scripts/validate_configs.py

if grep -qE 'TersaAgent|TersaNoCaveAgent|TersaPonytailAgent|TersaKarpathyAgent' "$config"; then
  uv run python scripts/verify_skill_sources.py
fi

uv run harbor run --config "$config" --yes
