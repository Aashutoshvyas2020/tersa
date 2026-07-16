.PHONY: sync check validate test skills canary

sync:
	uv sync --extra dev

validate:
	uv run python scripts/validate_configs.py

test:
	uv run pytest

skills:
	uv run python scripts/verify_skill_sources.py

check: validate test
	uv run ruff check .

canary:
	./scripts/run_canary.sh
