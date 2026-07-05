#!/usr/bin/env python3
"""Validate benchmark YAML files, with optional Harbor schema validation."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml

REQUIRED_TOP_LEVEL = {
    "job_name",
    "jobs_dir",
    "n_attempts",
    "n_concurrent_trials",
    "environment",
    "agents",
    "datasets",
}


def load_config(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path}: root must be a mapping")
    missing = REQUIRED_TOP_LEVEL - data.keys()
    if missing:
        raise ValueError(f"{path}: missing keys: {sorted(missing)}")
    if not isinstance(data["agents"], list) or not data["agents"]:
        raise ValueError(f"{path}: agents must be a non-empty list")
    if not isinstance(data["datasets"], list) or not data["datasets"]:
        raise ValueError(f"{path}: datasets must be a non-empty list")
    return data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--syntax-only", action="store_true")
    args = parser.parse_args()

    configs = sorted(Path("configs").glob("*.yaml"))
    if not configs:
        raise SystemExit("No configs found")

    schema = None
    if not args.syntax_only:
        try:
            from harbor.models.job.config import JobConfig
        except ImportError as exc:
            raise SystemExit(
                "Harbor is not installed. Run `uv sync --extra dev`, or pass --syntax-only."
            ) from exc
        schema = JobConfig

    for path in configs:
        data = load_config(path)
        if schema is not None:
            schema.model_validate(data)
        print(f"OK {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
