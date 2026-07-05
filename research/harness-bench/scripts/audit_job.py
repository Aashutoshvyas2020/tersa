#!/usr/bin/env python3
"""Fail closed when a Harbor job lacks evidence needed for benchmark claims."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} does not contain a JSON object")
    return value


def audit_tersa_profile(
    trial: Path,
    agent_name: str,
    errors: list[str],
) -> None:
    manifest_path = trial / "agent" / "benchmark-profile.json"
    if not manifest_path.exists():
        errors.append(f"{trial.name}: missing agent/benchmark-profile.json")
        return

    manifest = read_json(manifest_path)
    profile = manifest.get("profile")
    cave_mode = manifest.get("cave_mode")
    required = manifest.get("required_skill_dirs")
    skill_sources = manifest.get("skill_sources")

    if not isinstance(profile, str):
        errors.append(f"{trial.name}: benchmark profile is missing")
    if not isinstance(cave_mode, bool):
        errors.append(f"{trial.name}: cave_mode evidence is missing")
    if not isinstance(required, list):
        errors.append(f"{trial.name}: required_skill_dirs evidence is missing")
    if not isinstance(skill_sources, list):
        errors.append(f"{trial.name}: skill_sources provenance is missing")
    elif profile != "bare":
        for source in skill_sources:
            if not isinstance(source, dict) or len(str(source.get("commit", ""))) != 40:
                errors.append(
                    f"{trial.name}: malformed skill source provenance {source!r}"
                )

    expected = {
        "tersa-bare": ("bare", True),
        "tersa-workflow": ("workflow", True),
        "tersa-workflow-no-cave": ("workflow", False),
        "tersa-workflow-ponytail": ("ponytail", True),
        "tersa-workflow-karpathy": ("karpathy", True),
    }.get(agent_name)
    if expected and (profile, cave_mode) != expected:
        errors.append(
            f"{trial.name}: profile evidence {(profile, cave_mode)!r} "
            f"does not match agent {agent_name!r} expected {expected!r}"
        )

    for filename in ("diff-numstat.tsv", "diff-files.txt", "git-status.txt"):
        if not (trial / "agent" / filename).exists():
            errors.append(f"{trial.name}: missing agent/{filename}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("job_dir", type=Path)
    args = parser.parse_args()

    job_dir = args.job_dir
    if not (job_dir / "config.json").exists():
        raise SystemExit(f"Missing {job_dir / 'config.json'}")
    if not (job_dir / "result.json").exists():
        raise SystemExit(f"Missing {job_dir / 'result.json'}")

    trial_dirs = sorted(
        path.parent
        for path in job_dir.glob("*/result.json")
        if path.parent != job_dir
    )
    if not trial_dirs:
        raise SystemExit("No trial result directories found")

    errors: list[str] = []
    warnings: list[str] = []
    for trial in trial_dirs:
        trajectory_path = trial / "agent" / "trajectory.json"
        reward_path = trial / "verifier" / "reward.txt"

        if not trajectory_path.exists():
            errors.append(f"{trial.name}: missing agent/trajectory.json")
            continue
        if not reward_path.exists():
            errors.append(f"{trial.name}: missing verifier/reward.txt")

        trajectory = read_json(trajectory_path)
        agent = trajectory.get("agent") or {}
        final = trajectory.get("final_metrics") or {}

        for field in ("name", "version", "model_name"):
            if not agent.get(field):
                errors.append(f"{trial.name}: trajectory.agent.{field} is missing")

        prompt = final.get("total_prompt_tokens")
        completion = final.get("total_completion_tokens")
        if prompt is None:
            errors.append(f"{trial.name}: total_prompt_tokens is missing")
        if completion is None:
            errors.append(f"{trial.name}: total_completion_tokens is missing")
        if final.get("total_cost_usd") is None:
            warnings.append(
                f"{trial.name}: total_cost_usd is unavailable; report cost as NA"
            )

        agent_name = str(agent.get("name") or "")
        if agent_name.startswith("tersa-"):
            audit_tersa_profile(trial, agent_name, errors)

    print(f"Audited {len(trial_dirs)} trials")
    for warning in warnings:
        print(f"WARN {warning}")
    for error in errors:
        print(f"ERROR {error}")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
