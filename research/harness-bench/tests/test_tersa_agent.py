from pathlib import Path

import pytest
import yaml

from harness_bench.agents.tersa import (
    TersaAgent,
    TersaBareAgent,
    TersaKarpathyAgent,
    TersaNoCaveAgent,
    TersaPonytailAgent,
    split_harbor_model,
)
from harness_bench.profiles import (
    COMMON_WORKFLOW_SKILLS,
    GSD_SKILLS,
    KARPATHY_SKILLS,
    PONYTAIL_SKILLS,
    SKILL_SOURCES,
    SUPERPOWERS_SKILLS,
    get_profile,
)


def test_split_anthropic_model() -> None:
    assert split_harbor_model("anthropic/claude-opus-4-6") == (
        "anthropic",
        "claude-opus-4-6",
    )


def test_split_openai_model() -> None:
    assert split_harbor_model("openai/gpt-5.5") == ("openai", "gpt-5.5")


@pytest.mark.parametrize("value", [None, "", "gpt-5.5", "openai/"])
def test_rejects_unqualified_or_empty_models(value: str | None) -> None:
    with pytest.raises(ValueError):
        split_harbor_model(value)


def test_rejects_unvalidated_provider() -> None:
    with pytest.raises(ValueError, match="not validated"):
        split_harbor_model("google/gemini-3")


def test_workflow_profile_is_default(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    agent = TersaAgent(
        logs_dir=tmp_path,
        model_name="anthropic/claude-opus-4-6",
        version="0.16.5",
    )
    provider, model, env = agent.build_runtime()
    assert provider == "anthropic"
    assert model == "claude-opus-4-6"
    assert agent.profile.id == "workflow"
    assert env["TERSA_CAVE_MODE"] == "1"
    assert env["HARNESS_BENCH_PROFILE"] == "workflow"
    assert env["ANTHROPIC_API_KEY"] == "test-key"


def test_no_cave_keeps_workflow_profile(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    agent = TersaNoCaveAgent(
        logs_dir=tmp_path,
        model_name="openai/gpt-5.5",
        version="0.16.5",
    )
    provider, model, env = agent.build_runtime()
    assert provider == "openai"
    assert model == "gpt-5.5"
    assert agent.profile.id == "workflow"
    assert env["TERSA_CAVE_MODE"] == "0"
    assert env["CLAUDE_CODE_USE_OPENAI"] == "1"


@pytest.mark.parametrize(
    ("agent_type", "profile_id", "agent_name"),
    [
        (TersaBareAgent, "bare", "tersa-bare"),
        (TersaPonytailAgent, "ponytail", "tersa-workflow-ponytail"),
        (TersaKarpathyAgent, "karpathy", "tersa-workflow-karpathy"),
    ],
)
def test_profile_agents(
    agent_type: type[TersaAgent],
    profile_id: str,
    agent_name: str,
    tmp_path: Path,
) -> None:
    agent = agent_type(
        logs_dir=tmp_path,
        model_name="anthropic/claude-opus-4-6",
        version="0.16.5",
    )
    assert agent.profile.id == profile_id
    assert agent.name() == agent_name


def test_profiles_require_expected_upstream_skills() -> None:
    assert get_profile("workflow").required_skill_dirs == (
        "using-superpowers",
        "create-skill",
    )
    assert get_profile("workflow").source_ids == ("superpowers", "gsd")
    assert "ponytail" in get_profile("ponytail").required_skill_dirs
    assert get_profile("ponytail").source_ids[-1] == "ponytail"
    assert "karpathy-guardrails" in get_profile("karpathy").required_skill_dirs
    assert get_profile("karpathy").source_ids[-1] == "karpathy"


def test_unknown_profile_fails_closed() -> None:
    with pytest.raises(ValueError, match="Unknown Tersa benchmark profile"):
        get_profile("imaginary")


def test_skill_sources_are_immutable_git_refs() -> None:
    for source in SKILL_SOURCES:
        assert len(source.commit) == 40
        int(source.commit, 16)
        assert source.repository.endswith(".git")
        assert source.subdir
        assert source.destination.startswith(".bench-skills/")


def test_common_workflow_skills_are_gsd_and_superpowers() -> None:
    assert COMMON_WORKFLOW_SKILLS == (SUPERPOWERS_SKILLS, GSD_SKILLS)


def test_ablation_config_changes_one_treatment_at_a_time() -> None:
    config = yaml.safe_load(
        Path("configs/draft-tersa-ablation-claude.yaml").read_text()
    )
    agents = config["agents"]
    assert len(agents) == 4

    common = [SUPERPOWERS_SKILLS, GSD_SKILLS]
    assert agents[0]["skills"] == common
    assert agents[1]["skills"] == common
    assert agents[2]["skills"] == common + [PONYTAIL_SKILLS]
    assert agents[3]["skills"] == common + [KARPATHY_SKILLS]

    assert agents[0]["kwargs"]["cave_mode"] is True
    assert "cave_mode" not in agents[1]["kwargs"]
    assert agents[2]["kwargs"]["cave_mode"] is True
    assert agents[3]["kwargs"]["cave_mode"] is True
