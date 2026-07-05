#!/usr/bin/env python3
"""Summarize verified efficiency from a Harbor job directory.

The script reports success and resource use together. It refuses to turn missing
token or cost evidence into zero. For Tersa trials it also reads the adapter's
post-run git diff metrics.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Aggregate:
    attempts: int = 0
    passes: int = 0
    exceptions: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_tokens: int = 0
    token_rows: int = 0
    cost_usd: float = 0.0
    cost_rows: int = 0
    execution_seconds: float = 0.0
    time_rows: int = 0
    files_changed: int = 0
    lines_added: int = 0
    lines_deleted: int = 0
    diff_rows: int = 0
    profiles: set[str] = field(default_factory=set)


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def primary_reward(result: dict[str, Any]) -> float | None:
    verifier = result.get("verifier_result")
    if not isinstance(verifier, dict):
        return None
    rewards = verifier.get("rewards")
    if not isinstance(rewards, dict) or not rewards:
        return None
    if "reward" in rewards:
        return float(rewards["reward"])
    values = [float(value) for value in rewards.values()]
    return sum(values) / len(values)


def duration_seconds(timing: Any) -> float | None:
    if not isinstance(timing, dict):
        return None
    started = timing.get("started_at")
    finished = timing.get("finished_at")
    if not started or not finished:
        return None
    from datetime import datetime

    return (
        datetime.fromisoformat(finished.replace("Z", "+00:00"))
        - datetime.fromisoformat(started.replace("Z", "+00:00"))
    ).total_seconds()


def read_diff(trial_dir: Path) -> tuple[int, int, int] | None:
    path = trial_dir / "agent" / "diff-numstat.tsv"
    if not path.exists():
        return None
    files = added = deleted = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        files += 1
        if parts[0].isdigit():
            added += int(parts[0])
        if parts[1].isdigit():
            deleted += int(parts[1])
    return files, added, deleted


def ratio(value: float, denominator: int) -> str:
    return "NA" if denominator == 0 else f"{value / denominator:.2f}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("job_dir", type=Path)
    parser.add_argument(
        "--pass-threshold",
        type=float,
        default=0.999,
        help="Reward at or above this value counts as a verified pass.",
    )
    args = parser.parse_args()

    groups: dict[str, Aggregate] = defaultdict(Aggregate)
    result_paths = sorted(args.job_dir.glob("*/result.json"))
    if not result_paths:
        raise SystemExit("No trial result.json files found")

    for result_path in result_paths:
        result = read_json(result_path)
        agent_info = result.get("agent_info") or {}
        agent = str(agent_info.get("name") or "unknown")
        aggregate = groups[agent]
        aggregate.attempts += 1
        if result.get("exception_info"):
            aggregate.exceptions += 1

        reward = primary_reward(result)
        if reward is not None and reward >= args.pass_threshold:
            aggregate.passes += 1

        context = result.get("agent_result") or {}
        token_values = (
            context.get("n_input_tokens"),
            context.get("n_output_tokens"),
            context.get("n_cache_tokens"),
        )
        if all(value is not None for value in token_values):
            aggregate.input_tokens += int(token_values[0])
            aggregate.output_tokens += int(token_values[1])
            aggregate.cache_tokens += int(token_values[2])
            aggregate.token_rows += 1

        cost = context.get("cost_usd")
        if cost is not None:
            aggregate.cost_usd += float(cost)
            aggregate.cost_rows += 1

        seconds = duration_seconds(result.get("agent_execution"))
        if seconds is not None:
            aggregate.execution_seconds += seconds
            aggregate.time_rows += 1

        diff = read_diff(result_path.parent)
        if diff is not None:
            files, added, deleted = diff
            aggregate.files_changed += files
            aggregate.lines_added += added
            aggregate.lines_deleted += deleted
            aggregate.diff_rows += 1

        manifest_path = result_path.parent / "agent" / "benchmark-profile.json"
        if manifest_path.exists():
            manifest = read_json(manifest_path)
            profile = manifest.get("profile")
            if profile:
                aggregate.profiles.add(str(profile))

    columns = [
        "agent",
        "profile",
        "attempts",
        "passes",
        "pass_rate",
        "tokens/pass",
        "cost/pass",
        "seconds/pass",
        "diff_lines/attempt",
        "exceptions",
    ]
    print("\t".join(columns))
    for agent, aggregate in sorted(groups.items()):
        total_tokens = aggregate.input_tokens + aggregate.output_tokens
        pass_rate = aggregate.passes / aggregate.attempts
        profile = ",".join(sorted(aggregate.profiles)) or "-"
        tokens_per_pass = (
            "NA"
            if aggregate.token_rows != aggregate.attempts
            else ratio(total_tokens, aggregate.passes)
        )
        cost_per_pass = (
            "NA"
            if aggregate.cost_rows != aggregate.attempts
            else ratio(aggregate.cost_usd, aggregate.passes)
        )
        seconds_per_pass = (
            "NA"
            if aggregate.time_rows != aggregate.attempts
            else ratio(aggregate.execution_seconds, aggregate.passes)
        )
        diff_per_attempt = (
            "NA"
            if aggregate.diff_rows != aggregate.attempts
            else ratio(
                aggregate.lines_added + aggregate.lines_deleted,
                aggregate.attempts,
            )
        )
        print(
            "\t".join(
                [
                    agent,
                    profile,
                    str(aggregate.attempts),
                    str(aggregate.passes),
                    f"{pass_rate:.3f}",
                    tokens_per_pass,
                    cost_per_pass,
                    seconds_per_pass,
                    diff_per_attempt,
                    str(aggregate.exceptions),
                ]
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
