import importlib.util
import subprocess
import sys
from pathlib import Path

from harness_bench.profiles import SkillSource

MODULE_PATH = Path("scripts/verify_skill_sources.py")
SPEC = importlib.util.spec_from_file_location("verify_skill_sources", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, text=True, capture_output=True, check=True
    )
    return result.stdout.strip()


def test_materializes_exact_commit_and_verifies_skill(tmp_path: Path) -> None:
    upstream = tmp_path / "upstream"
    upstream.mkdir()
    git(upstream, "init", "-b", "main")
    git(upstream, "config", "user.name", "Test")
    git(upstream, "config", "user.email", "test@example.invalid")
    skill = upstream / "skills" / "example"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text(
        "---\nname: example\ndescription: test\n---\n# Example\n",
        encoding="utf-8",
    )
    git(upstream, "add", ".")
    git(upstream, "commit", "-m", "Add example skill")
    commit = git(upstream, "rev-parse", "HEAD")

    source = SkillSource(
        id="example",
        repository=str(upstream),
        commit=commit,
        subdir="skills",
        destination=".bench-skills/example",
        expected_skill="example",
    )
    destination = MODULE.materialize(source, tmp_path)
    digests = MODULE.verify(destination, source)

    assert (destination / "example" / "SKILL.md").exists()
    assert len(digests) == 1
    assert digests[0].startswith("example:sha256:")
    metadata = MODULE.metadata_path(destination).read_text(encoding="utf-8")
    assert commit in metadata
