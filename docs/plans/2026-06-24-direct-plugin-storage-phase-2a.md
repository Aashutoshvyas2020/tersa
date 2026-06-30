# Phase 2A — Direct Plugin Storage and CaveKit Migration

Date: 2026-06-24
Base commit: `0b56d84` (`Remove detached product surfaces`)
Branch: `cleanup/remove-unused-surfaces`

## Goal

Add persistent direct plugins without depending on marketplace records, then migrate CaveKit from `ck@cavekit-local` to direct plugin id `ck` without losing its version, install path, persistent data, or runtime contributions.

## Commands

- `tersa plugin add <path-or-git-url>`
- `tersa plugin remove <id>`
- `tersa plugin list`
- `tersa plugin reload [id]`
- `tersa plugin migrate-cavekit`

Marketplace install/uninstall commands remain available during Phase 2A. Marketplace UI and infrastructure are removed only in Phase 2B.

## Storage contract

- Registry: `~/.tersa/plugins/direct_plugins.json`
- Schema version: `1`
- Atomic temp-file replacement
- Previous registry snapshot: `direct_plugins.json.bak`
- Git plugins use immutable version directories and retain previous active versions for rollback
- Local path plugins reference their canonical source path and are never copied or deleted
- Plugin records retain source, resolved install path, manifest version, git revision when available, timestamps, enabled state, and optional legacy data identity

## Runtime precedence

1. Built-in plugins
2. Marketplace plugins
3. Persistent direct plugins
4. Session-only `--plugin-dir` plugins

Higher entries in this list override lower-precedence plugins with the same manifest name, except managed-policy locks retain their existing behavior.

## CaveKit transaction

1. Read `ck@cavekit-local` from the current Tersa installed-plugin state.
2. Create direct record `ck` using the same install path, version, and git revision.
3. Map `ck@direct` plugin data access to the legacy `ck@cavekit-local` data identity.
4. Clear plugin caches and verify that `ck@direct` fully loads through the normal plugin loader.
5. Archive Tersa marketplace state and enabled settings.
6. Remove only the Tersa-side legacy CaveKit marketplace references.
7. Reload and verify `ck@direct` again.
8. On any failure, restore every modified file and the prior direct registry. The legacy `.claude` state remains untouched throughout.

## Acceptance checks

- Direct local plugin add/list/remove/reload tests
- Registry backup and rollback tests
- Failed CaveKit migration leaves all prior state unchanged
- Successful CaveKit migration preserves path, version, revision, and data identity
- Direct plugin loader preserves commands, skills, agents, hooks, output styles, MCP, LSP, and config through the existing plugin construction path
- Existing plugin/skill/MCP tests pass
- Tersa focused and full release gates pass
- Privacy verification, typecheck baseline, interactive canary, and npm dry-run pass
- Phase is committed separately and can be reverted independently
