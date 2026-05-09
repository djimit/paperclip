# K8s Execution Target Changelog

## 2026-05-09 — Phase A complete

Workspace strategy + realization types now live in @paperclipai/workspace-strategy.
@paperclipai/shared re-exports them so existing callers were not modified.
Callers may opt to migrate imports in a follow-up; this PR keeps blast radius
to the smallest reasonable cross-section.
