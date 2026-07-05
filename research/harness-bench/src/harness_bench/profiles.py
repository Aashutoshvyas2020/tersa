"""Locked benchmark profiles and exact upstream skill sources."""

from dataclasses import dataclass


@dataclass(frozen=True)
class SkillSource:
    id: str
    repository: str
    commit: str
    subdir: str
    destination: str
    expected_skill: str


SKILL_SOURCES: tuple[SkillSource, ...] = (
    SkillSource(
        id="superpowers",
        repository="https://github.com/obra/superpowers.git",
        commit="add6a283b17c90dba37fe538b02b7242a512d35f",
        subdir="skills",
        destination=".bench-skills/superpowers",
        expected_skill="using-superpowers",
    ),
    SkillSource(
        id="gsd",
        repository="https://github.com/open-gsd/gsd-pi.git",
        commit="c117986d773d5837a76329b3149e478936e99a42",
        subdir="src/resources/skills",
        destination=".bench-skills/gsd",
        expected_skill="create-skill",
    ),
    SkillSource(
        id="ponytail",
        repository="https://github.com/DietrichGebert/ponytail.git",
        commit="b8f20b8e7cc933c516d8928a7e4f3786df05fb65",
        subdir="skills",
        destination=".bench-skills/ponytail",
        expected_skill="ponytail",
    ),
    SkillSource(
        id="karpathy",
        repository=(
            "https://github.com/hashgraph-online/awesome-codex-plugins.git"
        ),
        commit="ea21be1e1acc285ada59429a9835ef7447a0194f",
        subdir=(
            "plugins/JuliusBrussee/blueprint/skills/karpathy-guardrails"
        ),
        destination=".bench-skills/karpathy-guardrails",
        expected_skill="karpathy-guardrails",
    ),
)

SKILL_SOURCE_BY_ID = {source.id: source for source in SKILL_SOURCES}

SUPERPOWERS_SKILLS = "./.bench-skills/superpowers"
GSD_SKILLS = "./.bench-skills/gsd"
PONYTAIL_SKILLS = "./.bench-skills/ponytail"
KARPATHY_SKILLS = "./.bench-skills/karpathy-guardrails"

COMMON_WORKFLOW_SKILLS = (SUPERPOWERS_SKILLS, GSD_SKILLS)


@dataclass(frozen=True)
class ProfileDefinition:
    id: str
    label: str
    instruction: str
    required_skill_dirs: tuple[str, ...]
    source_ids: tuple[str, ...]


PROFILES: dict[str, ProfileDefinition] = {
    "bare": ProfileDefinition(
        id="bare",
        label="Tersa bare harness",
        instruction="",
        required_skill_dirs=(),
        source_ids=(),
    ),
    "workflow": ProfileDefinition(
        id="workflow",
        label="Tersa + GSD + Superpowers",
        instruction=(
            "The benchmark workflow profile is active. Use the relevant "
            "Superpowers skills before acting. Apply the GSD workflow discipline: "
            "make the goal and success checks explicit, plan the smallest useful "
            "unit of work, implement it, run concrete verification, and preserve "
            "evidence. This is a non-interactive benchmark: use the task and "
            "repository as authority, proceed without waiting for approval, and "
            "do not create ceremony or persistent planning artifacts that the "
            "task does not require."
        ),
        required_skill_dirs=("using-superpowers", "create-skill"),
        source_ids=("superpowers", "gsd"),
    ),
    "ponytail": ProfileDefinition(
        id="ponytail",
        label="Tersa + GSD + Superpowers + Ponytail full",
        instruction=(
            "The benchmark workflow profile is active. Use the relevant "
            "Superpowers skills and GSD workflow discipline. In addition, invoke "
            "and obey the ponytail skill at full intensity for the entire coding "
            "task. This is non-interactive; proceed without waiting for approval. "
            "Preserve security, trust-boundary validation, data-loss protection, "
            "required accessibility, migrations, and tests."
        ),
        required_skill_dirs=("using-superpowers", "create-skill", "ponytail"),
        source_ids=("superpowers", "gsd", "ponytail"),
    ),
    "karpathy": ProfileDefinition(
        id="karpathy",
        label="Tersa + GSD + Superpowers + Karpathy Guardrails",
        instruction=(
            "The benchmark workflow profile is active. Use the relevant "
            "Superpowers skills and GSD workflow discipline. In addition, invoke "
            "and obey the karpathy-guardrails skill from the start of the task: "
            "think before coding, prefer simplicity, make surgical changes, and "
            "map work to verifiable success criteria. This is non-interactive: "
            "use the task and repository as authority and do not wait for approval."
        ),
        required_skill_dirs=(
            "using-superpowers",
            "create-skill",
            "karpathy-guardrails",
        ),
        source_ids=("superpowers", "gsd", "karpathy"),
    ),
}


def get_profile(profile_id: str) -> ProfileDefinition:
    try:
        return PROFILES[profile_id]
    except KeyError as exc:
        valid = ", ".join(sorted(PROFILES))
        raise ValueError(
            f"Unknown Tersa benchmark profile {profile_id!r}. "
            f"Valid profiles: {valid}"
        ) from exc
