#!/usr/bin/env python3
"""Materialize exact upstream skill commits and verify them with Harbor.

Harbor's Git skill resolver is excellent for branches and tags, but its current
`git ls-remote <ref>` path is not a reliable raw-commit fetch mechanism. This
script fetches the exact object IDs directly, copies only the declared skill
subdirectories, then asks Harbor to validate and digest the local result.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from harbor.skills import compute_skill_digest, resolve_skills

from harness_bench.profiles import SKILL_SOURCES, SkillSource


def run(command: list[str], cwd: Path) -> str:
    result = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )
    return result.stdout.strip()


def metadata_path(destination: Path) -> Path:
    return destination / ".harness-bench-source.json"


def valid_existing(destination: Path, source: SkillSource) -> bool:
    path = metadata_path(destination)
    if not destination.exists() or not path.exists():
        return False
    try:
        metadata = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return (
        metadata.get("repository") == source.repository
        and metadata.get("commit") == source.commit
        and metadata.get("subdir") == source.subdir
    )


def materialize(source: SkillSource, root: Path, force: bool = False) -> Path:
    destination = root / source.destination
    if not force and valid_existing(destination, source):
        return destination

    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"harness-bench-{source.id}-") as raw:
        checkout = Path(raw) / "checkout"
        checkout.mkdir()
        run(["git", "init", "--quiet"], checkout)
        run(["git", "remote", "add", "origin", source.repository], checkout)
        run(["git", "sparse-checkout", "init", "--cone"], checkout)
        run(["git", "sparse-checkout", "set", source.subdir], checkout)
        run(
            [
                "git",
                "fetch",
                "--quiet",
                "--depth=1",
                "origin",
                source.commit,
            ],
            checkout,
        )
        run(["git", "checkout", "--quiet", "--detach", "FETCH_HEAD"], checkout)
        actual = run(["git", "rev-parse", "HEAD"], checkout)
        if actual != source.commit:
            raise RuntimeError(
                f"{source.id}: fetched {actual}, expected {source.commit}"
            )

        source_path = checkout / source.subdir
        if not source_path.exists():
            raise RuntimeError(
                f"{source.id}: subdirectory {source.subdir!r} is absent "
                f"at commit {source.commit}"
            )

        staged = destination.with_name(destination.name + ".staging")
        if staged.exists():
            shutil.rmtree(staged)
        shutil.copytree(source_path, staged)
        metadata_path(staged).write_text(
            json.dumps(
                {
                    "repository": source.repository,
                    "commit": source.commit,
                    "subdir": source.subdir,
                },
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        if destination.exists():
            shutil.rmtree(destination)
        staged.rename(destination)

    return destination


def verify(destination: Path, source: SkillSource) -> list[str]:
    skills = {skill.name: skill for skill in resolve_skills([destination])}
    if source.expected_skill not in skills:
        raise RuntimeError(
            f"{source.id}: expected {source.expected_skill!r}; "
            f"found {sorted(skills)}"
        )
    return [
        f"{name}:{compute_skill_digest(skill.source)}"
        for name, skill in sorted(skills.items())
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Repository root containing .bench-skills.",
    )
    args = parser.parse_args()

    for source in SKILL_SOURCES:
        destination = materialize(source, args.root, force=args.force)
        digests = verify(destination, source)
        print(
            f"OK {source.id} {source.commit} {destination} "
            f"{len(digests)} skills"
        )
        for digest in digests:
            print(f"  {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
