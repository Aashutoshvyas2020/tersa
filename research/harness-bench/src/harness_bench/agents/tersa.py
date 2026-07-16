"""Harbor adapter for Tersa.

The adapter reuses Harbor's Claude Code session parser because Tersa retains the
compatible session JSONL and stream-JSON surfaces. Installation, launch,
provider routing, identity, benchmark profiles, and output paths are overridden.

The compatibility assumption remains provisional until the canary checks in
docs/ADAPTER_VALIDATION.md pass against the pinned versions.
"""

from __future__ import annotations

import json
import re
import shlex
from pathlib import Path
from typing import Any, override

from harbor.agents.installed.base import CliFlag, with_prompt_template
from harbor.agents.installed.claude_code import ClaudeCode
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext
from harbor.models.trial.paths import EnvironmentPaths

from harness_bench.profiles import (
    SKILL_SOURCE_BY_ID,
    ProfileDefinition,
    get_profile,
)

_PROVIDER_ALIASES = {
    "anthropic": "anthropic",
    "openai": "openai",
}


def split_harbor_model(model_name: str | None) -> tuple[str, str]:
    """Convert Harbor's provider/model form into Tersa provider and model flags."""
    if not model_name or "/" not in model_name:
        raise ValueError(
            "Tersa benchmark models must use Harbor's provider/model form, "
            "for example anthropic/claude-opus-4-6 or openai/gpt-5.5."
        )

    provider, model = model_name.split("/", 1)
    provider = _PROVIDER_ALIASES.get(provider, provider)
    if provider not in _PROVIDER_ALIASES.values():
        raise ValueError(
            f"Provider {provider!r} is not validated by this adapter. "
            "The initial benchmark supports only anthropic and openai model islands."
        )
    if not model:
        raise ValueError("Model identifier cannot be empty.")
    return provider, model


class TersaAgent(ClaudeCode):
    """Tersa with the default GSD + Superpowers workflow profile and CAVE on."""

    SUPPORTS_ATIF = True
    _OUTPUT_FILENAME = "tersa.txt"

    CLI_FLAGS = [
        CliFlag("max_turns", cli="--max-turns", type="int"),
        CliFlag(
            "reasoning_effort",
            cli="--effort",
            type="enum",
            choices=["low", "medium", "high", "max"],
        ),
        CliFlag(
            "thinking",
            cli="--thinking",
            type="enum",
            choices=["enabled", "adaptive", "disabled"],
        ),
        CliFlag("max_budget_usd", cli="--max-budget-usd", type="str"),
        CliFlag("allowed_tools", cli="--allowed-tools", type="str"),
        CliFlag("disallowed_tools", cli="--disallowed-tools", type="str"),
        CliFlag(
            "permission_mode",
            cli="--permission-mode",
            type="enum",
            choices=[
                "default",
                "acceptEdits",
                "plan",
                "auto",
                "dontAsk",
                "bypassPermissions",
            ],
            default="bypassPermissions",
            format="--permission-mode={value}",
        ),
    ]

    def __init__(
        self,
        logs_dir: Path,
        cave_mode: bool = True,
        profile: str = "workflow",
        *args: Any,
        **kwargs: Any,
    ) -> None:
        self.cave_mode = cave_mode
        self.profile: ProfileDefinition = get_profile(profile)
        super().__init__(logs_dir, *args, **kwargs)

    @staticmethod
    @override
    def name() -> str:
        return "tersa-workflow"

    @override
    def get_version_command(self) -> str | None:
        return ". ~/.nvm/nvm.sh; tersa --version"

    @override
    def parse_version(self, stdout: str) -> str:
        match = re.search(r"(\d+\.\d+\.\d+)", stdout)
        return match.group(1) if match else stdout.strip()

    async def _installed_tersa_satisfies_version(
        self, environment: BaseEnvironment
    ) -> bool:
        check = await environment.exec(
            command=". ~/.nvm/nvm.sh 2>/dev/null || true; "
            "command -v tersa >/dev/null 2>&1"
        )
        if check.return_code != 0:
            return False
        if self._version is None:
            return True

        version_result = await environment.exec(command=self.get_version_command() or "")
        if version_result.return_code != 0:
            return False
        return self.parse_version(version_result.stdout or "") == self._version

    @override
    async def install(self, environment: BaseEnvironment) -> None:
        if await self._installed_tersa_satisfies_version(environment):
            self.logger.debug("Tersa is already available at the requested version")
            return

        await self.exec_as_root(
            environment,
            command=(
                "if command -v apt-get >/dev/null 2>&1; then "
                "apt-get update && apt-get install -y "
                "curl ca-certificates git procps ripgrep; "
                "elif command -v apk >/dev/null 2>&1; then "
                "apk add --no-cache "
                "curl ca-certificates git procps ripgrep nodejs npm; "
                "else echo 'Unsupported package manager for the Tersa adapter' "
                ">&2; exit 1; fi"
            ),
            env={"DEBIAN_FRONTEND": "noninteractive"},
        )

        version_spec = f"@{self._version}" if self._version else "@latest"
        await self.exec_as_agent(
            environment,
            command=(
                "set -euo pipefail; "
                "curl -o- "
                "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh "
                "| bash && "
                'export NVM_DIR="$HOME/.nvm" && '
                '\\. "$NVM_DIR/nvm.sh" || true && '
                "command -v nvm >/dev/null 2>&1 || "
                "{ echo 'Error: NVM failed to load' >&2; exit 1; } && "
                "nvm install 22 && nvm alias default 22 && npm -v && "
                f"npm install -g tersa-cli{version_spec} && "
                "tersa --version"
            ),
        )

    def _copy_env(self, keys: tuple[str, ...]) -> dict[str, str]:
        copied: dict[str, str] = {}
        for key in keys:
            value = self._get_env(key)
            if value:
                copied[key] = value
        return copied

    def build_runtime(self) -> tuple[str, str, dict[str, str]]:
        """Return provider, model, and the isolated environment for a Tersa run."""
        provider, model = split_harbor_model(self.model_name)

        env = self._copy_env(
            (
                "ANTHROPIC_API_KEY",
                "ANTHROPIC_AUTH_TOKEN",
                "ANTHROPIC_BASE_URL",
                "CLAUDE_CODE_OAUTH_TOKEN",
                "OPENAI_API_KEY",
                "OPENAI_BASE_URL",
                "OPENAI_API_BASE",
                "OPENAI_ORG_ID",
                "OPENAI_PROJECT_ID",
            )
        )

        if provider == "anthropic":
            env["ANTHROPIC_MODEL"] = model
        elif provider == "openai":
            env["CLAUDE_CODE_USE_OPENAI"] = "1"
            env["OPENAI_MODEL"] = model

        env.update(
            {
                "CLAUDE_CONFIG_DIR": (
                    EnvironmentPaths.agent_dir / "sessions"
                ).as_posix(),
                "TERSA_CAVE_MODE": "1" if self.cave_mode else "0",
                "HARNESS_BENCH_PROFILE": self.profile.id,
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
                "FORCE_AUTO_BACKGROUND_TASKS": "1",
                "ENABLE_BACKGROUND_TASKS": "1",
                "IS_SANDBOX": "1",
            }
        )
        env.update(self._resolved_env_vars)
        return provider, model, env

    def _parse_total_cost_from_stream_json(self) -> float | None:
        stream_path = self.logs_dir / self._OUTPUT_FILENAME
        try:
            content = stream_path.read_text(encoding="utf-8")
        except OSError:
            return None

        for line in content.splitlines():
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") != "result":
                continue
            cost = event.get("total_cost_usd")
            try:
                return float(cost) if cost is not None else None
            except (TypeError, ValueError):
                return None
        return None

    def _convert_events_to_trajectory(self, session_dir: Path):
        trajectory = super()._convert_events_to_trajectory(session_dir)
        if trajectory is None:
            return None
        profile_extra = {
            "benchmark_profile": self.profile.id,
            "cave_mode": self.cave_mode,
        }
        agent_extra = dict(trajectory.agent.extra or {})
        agent_extra.update(profile_extra)
        return trajectory.model_copy(
            update={
                "agent": trajectory.agent.model_copy(
                    update={"name": self.name(), "extra": agent_extra}
                )
            }
        )

    def _skill_preflight_command(self) -> str | None:
        checks = []
        for directory in self.profile.required_skill_dirs:
            path = f"$CLAUDE_CONFIG_DIR/skills/{directory}/SKILL.md"
            message = (
                f"Required benchmark skill {directory!r} is missing at {path}. "
                "The profile must fail closed rather than run an incomplete arm."
            )
            checks.append(f'[ -f "{path}" ] || {{ echo {shlex.quote(message)} >&2; exit 1; }}')
        return " && ".join(checks) if checks else None

    def _profile_manifest(self, provider: str, model: str) -> str:
        return json.dumps(
            {
                "schema_version": 1,
                "agent": self.name(),
                "profile": self.profile.id,
                "profile_label": self.profile.label,
                "cave_mode": self.cave_mode,
                "provider": provider,
                "model": model,
                "required_skill_dirs": list(self.profile.required_skill_dirs),
                "skill_sources": [
                    {
                        "id": source.id,
                        "repository": source.repository,
                        "commit": source.commit,
                        "subdir": source.subdir,
                    }
                    for source_id in self.profile.source_ids
                    for source in [SKILL_SOURCE_BY_ID[source_id]]
                ],
            },
            sort_keys=True,
        )

    async def _capture_diff_metrics(self, environment: BaseEnvironment) -> None:
        await self.exec_as_agent(
            environment,
            command=(
                "if git -C /app rev-parse --is-inside-work-tree >/dev/null 2>&1; then "
                "git -C /app diff --numstat > /logs/agent/diff-numstat.tsv; "
                "git -C /app diff --name-only > /logs/agent/diff-files.txt; "
                "git -C /app status --porcelain > /logs/agent/git-status.txt; "
                "else : > /logs/agent/diff-numstat.tsv; "
                ": > /logs/agent/diff-files.txt; "
                ": > /logs/agent/git-status.txt; fi"
            ),
        )

    @with_prompt_template
    @override
    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        provider, model, env = self.build_runtime()
        escaped_instruction = shlex.quote(instruction)

        setup_parts = [
            "mkdir -p $CLAUDE_CONFIG_DIR/debug",
            "$CLAUDE_CONFIG_DIR/projects/-app",
            "$CLAUDE_CONFIG_DIR/shell-snapshots",
            "$CLAUDE_CONFIG_DIR/statsig",
            "$CLAUDE_CONFIG_DIR/todos",
            "$CLAUDE_CONFIG_DIR/skills",
        ]
        setup_command = " ".join(setup_parts)

        for builder in (
            self._build_register_skills_command,
            self._build_register_memory_command,
            self._build_register_mcp_servers_command,
        ):
            command = builder()
            if command:
                setup_command += f" && {command}"

        preflight = self._skill_preflight_command()
        if preflight:
            setup_command += f" && {preflight}"

        manifest = self._profile_manifest(provider, model)
        setup_command += (
            " && printf '%s\\n' "
            f"{shlex.quote(manifest)} > /logs/agent/benchmark-profile.json"
        )

        await self.exec_as_agent(environment, command=setup_command, env=env)

        cli_flags = self.build_cli_flags()
        extra_flags = f"{cli_flags} " if cli_flags else ""
        profile_flag = ""
        if self.profile.instruction:
            profile_flag = (
                "--append-system-prompt "
                f"{shlex.quote(self.profile.instruction)} "
            )

        await self.exec_as_agent(
            environment,
            command=(
                ". ~/.nvm/nvm.sh; "
                "tersa --verbose --output-format=stream-json --print "
                f"--provider {shlex.quote(provider)} "
                f"--model {shlex.quote(model)} "
                f"{profile_flag}"
                f"{extra_flags}"
                f"-- {escaped_instruction} "
                f"2>&1 </dev/null | stdbuf -oL tee "
                f"/logs/agent/{self._OUTPUT_FILENAME}"
            ),
            env=env,
        )
        await self._capture_diff_metrics(environment)


class TersaBareAgent(TersaAgent):
    """Bare Tersa arm for same-model cross-harness comparisons."""

    def __init__(self, logs_dir: Path, *args: Any, **kwargs: Any) -> None:
        kwargs.pop("profile", None)
        super().__init__(logs_dir, *args, profile="bare", **kwargs)

    @staticmethod
    @override
    def name() -> str:
        return "tersa-bare"


class TersaNoCaveAgent(TersaAgent):
    """Workflow arm with GSD + Superpowers retained and CAVE disabled."""

    def __init__(self, logs_dir: Path, *args: Any, **kwargs: Any) -> None:
        kwargs.pop("cave_mode", None)
        kwargs.pop("profile", None)
        super().__init__(
            logs_dir,
            *args,
            cave_mode=False,
            profile="workflow",
            **kwargs,
        )

    @staticmethod
    @override
    def name() -> str:
        return "tersa-workflow-no-cave"


class TersaPonytailAgent(TersaAgent):
    """Workflow arm with Ponytail full as the only added treatment."""

    def __init__(self, logs_dir: Path, *args: Any, **kwargs: Any) -> None:
        kwargs.pop("profile", None)
        super().__init__(logs_dir, *args, profile="ponytail", **kwargs)

    @staticmethod
    @override
    def name() -> str:
        return "tersa-workflow-ponytail"


class TersaKarpathyAgent(TersaAgent):
    """Workflow arm with Karpathy Guardrails as the only added treatment."""

    def __init__(self, logs_dir: Path, *args: Any, **kwargs: Any) -> None:
        kwargs.pop("profile", None)
        super().__init__(logs_dir, *args, profile="karpathy", **kwargs)

    @staticmethod
    @override
    def name() -> str:
        return "tersa-workflow-karpathy"
