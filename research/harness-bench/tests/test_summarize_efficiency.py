import importlib.util
import sys
from pathlib import Path

MODULE_PATH = Path("scripts/summarize_efficiency.py")
SPEC = importlib.util.spec_from_file_location("summarize_efficiency", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def test_primary_reward_prefers_reward_field() -> None:
    result = {"verifier_result": {"rewards": {"reward": 1, "secondary": 0}}}
    assert MODULE.primary_reward(result) == 1.0


def test_primary_reward_averages_multiple_metrics() -> None:
    result = {"verifier_result": {"rewards": {"a": 1, "b": 0.5}}}
    assert MODULE.primary_reward(result) == 0.75


def test_read_diff_counts_text_and_ignores_binary_line_counts(tmp_path: Path) -> None:
    agent = tmp_path / "agent"
    agent.mkdir()
    (agent / "diff-numstat.tsv").write_text(
        "10\t2\tsrc/a.py\n-\t-\timage.png\n3\t0\ttests/test_a.py\n"
    )
    assert MODULE.read_diff(tmp_path) == (3, 13, 2)
