# Tersa Exhaustive Visual and Keyboard Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce an image-reviewed, PTY-driven audit of every reachable Tersa terminal surface and default keyboard interaction, fix all P0/P1 defects and unaccepted P2 defects, and rerun the exact packed npm build.

**Architecture:** Reuse the existing `expect`-driven canary environment and fixture provider. A dedicated audit harness launches the actual built or packed CLI in a real PTY, sends raw terminal key sequences, records ANSI output and input traces, replays the stream through a terminal emulator, and renders lossless PNG frames with a fixed monospace font. Runtime command inventory and scenario results feed coverage matrices, contact sheets, and a ranked issue report.

**Tech Stack:** Bun/TypeScript, `/usr/bin/expect`, Python 3, `pyte`, Pillow, existing Tersa fixture-provider/canary environment, GitHub Actions macOS verification.

---

### Task 1: Freeze audit scope and runtime inventory

**Files:**
- Create: `scripts/visual-audit/inventory.ts`
- Create: `artifacts/visual-audit/manifest.json`

1. Export every runtime command with type, aliases, visibility, enabled state, and description from `getCommands()` under the deterministic canary environment.
2. Export all default keybinding contexts and actions.
3. Classify commands as interactive surface, transient output, destructive/action-only, external-integration, hidden, or unavailable.
4. Verify every slash-visible runtime command appears exactly once in the manifest.

### Task 2: Build deterministic PTY frame capture

**Files:**
- Create: `scripts/visual-audit/requirements.txt`
- Create: `scripts/visual-audit/capture.py`
- Create: `scripts/visual-audit/render.py`
- Create: `scripts/visual-audit/scenarios.py`
- Create: `scripts/visual-audit/test_capture.py`

1. Create an isolated audit Python environment with pinned `pyte`.
2. Spawn the actual CLI in a pseudo-terminal with exact rows and columns.
3. Record all bytes read and written, timestamps, terminal dimensions, environment label, exit code, and process cleanup.
4. Replay ANSI output into a terminal screen and render PNGs with Menlo.
5. Add deterministic self-tests for resize, cursor movement, ANSI colors, wide glyphs, fragmented escape sequences, and raw input logging.

### Task 3: Capture core conversation and responsive layouts

**Files:**
- Create: `artifacts/visual-audit/core/**`
- Create: `artifacts/visual-audit/core-review.md`

Capture startup, empty prompt, typed prompt, multiline input, autocomplete, model picker, simulated response, long output, errors, cancellation, status line, and resize states at 40/50/60/80/100/120/160 columns where applicable. Review every PNG for clipping, hierarchy, spacing, color, density, cursor placement, stale redraws, and responsive behavior.

### Task 4: Capture every registered command surface

**Files:**
- Create: `artifacts/visual-audit/commands/**`
- Create: `artifacts/visual-audit/command-coverage.md`

For every runtime-visible command, capture each reachable opening, populated, empty, error, selected, scrolled, detail, saved, cancelled, and reopened state. Explicitly document external states that require unavailable infrastructure.

### Task 5: Simulate every default keyboard binding

**Files:**
- Create: `artifacts/visual-audit/keyboard/**`
- Create: `artifacts/visual-audit/keyboard-coverage.md`

Send actual PTY bytes for prompt editing, submission, autocomplete, dialogs, history, transcript, tabs, scroll, attachments, footer, message selector, diff, model picker, plugin flows, escape/cancel behavior, paste, Unicode, Vim mode, chords, timing races, and resize races. Capture before/after PNGs and exact input traces.

### Task 6: Image-level review and issue classification

**Files:**
- Create: `artifacts/visual-audit/contact-sheets/**`
- Create: `artifacts/visual-audit/UI-REVIEW.md`
- Create: `artifacts/visual-audit/findings.json`

Inspect the actual PNGs rather than only text snapshots. Grade layout, spacing, hierarchy, typography, color/contrast, stability, and overall finish. Record screenshot, state, environment, key sequence, expected/actual behavior, reliability, source, severity, and proposed fix for every finding.

### Task 7: Fix findings with regression coverage

**Files:**
- Modify: exact source and test files identified by findings
- Create: before/after PNG pairs

Use TDD for each defect. Fix shared root causes, rerun focused PTY/image scenarios, and commit each coherent fix atomically. Leave no P0/P1 issues and no unaccepted P2 issues.

### Task 8: Packed npm and hosted verification

**Files:**
- Update: release/audit documentation and CI only as required

1. Rebuild and pack the exact release candidate.
2. Install it into an isolated prefix.
3. Repeat the critical screenshot and keyboard suite against the installed executable.
4. Run production typecheck, full tests, security audit, privacy scan, release gate, package dry run, and leak checks.
5. Publish only after the visual/keyboard audit is green and npm authentication is correctly configured.
