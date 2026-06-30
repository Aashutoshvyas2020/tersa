# Tersa macOS Readiness

Target: controlled external tester release on macOS arm64 with Codex OAuth as the only certified provider route.

The source checkout was dirty at baseline and remains untouched. Implementation runs in the isolated `work/tersa-public-readiness` worktree. Release requires clean source and packaged verification, behavioral tests for every visible mode, separate application and prompt-capability namespaces, and visual TUI review.
