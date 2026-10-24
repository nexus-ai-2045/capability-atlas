# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Adopted product direction

- Product name: Capability Atlas.
- Primary flow: 能力地図 → 更新差分と未採用理由 → 安全な1タスク実験 → 証跡 → 人間レビュー。
- Skills and MCPs use a separate catalog page from official product updates. The catalog supports genre-based discovery and evidence-based rankings; unmeasured items remain `未測定`.
- One-click install means one click to open an install review. The app must show the source, exact changes, permissions/network use, rollback, and review boundary before any real installation.
- The app is local-first. Auth, settings mutation, push, pull request, publication, external send, and paid actions never run automatically.
- The selected visual truth is `design/reference/capability-atlas-integrated.png`.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
