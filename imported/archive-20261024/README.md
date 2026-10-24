# 控えから取り込んだ古い版（2026-10-24）

このフォルダには、履歴を作り直す前の非公開の控えにだけ残っていた中身を、消さずに残すために置いています。

- 置き方: `<控えの枝またはタグ>/<元のパス>`。中身は控えのままです（下の「伏せたもの」を除く）。
- ここにあるファイルは実行も読み込みもされません。テストの収集からも外しています。
- 今のコードへ採り入れるかは、ファイルごとに別のPRで決めます。
- 公開側の履歴に同じ中身があるもの、行がすべて公開側にあるもの、ほかの版で行がそろうものは入れていません。
- 意図して外されていたもの（個人の情報を含む、公開側で削除済みなど）は入れていません。

## 入れたファイル

| 元のパス | 控えの枝・タグ | 置き場所 | 備考 |
|---|---|---|---|
| `.github/workflows/preflight.yml` | `ci/add-preflight-gate` | `ci/add-preflight-gate/.github/workflows/preflight.yml` |  |
| `PREFLIGHT.md` | `ci/add-preflight-gate` | `ci/add-preflight-gate/PREFLIGHT.md` |  |
| `.repo-preflight-consistency.json` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/.repo-preflight-consistency.json` |  |
| `AGENTS.md` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/AGENTS.md` |  |
| `README.md` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/README.md` |  |
| `docs/ARCHITECTURE.md` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/docs/ARCHITECTURE.md` |  |
| `docs/HUMAN_REVIEW.md` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/docs/HUMAN_REVIEW.md` |  |
| `package-lock.json` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/package-lock.json` |  |
| `package.json` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/package.json` |  |
| `src/App.jsx` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/src/App.jsx` |  |
| `src/App.test.jsx` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/src/App.test.jsx` |  |
| `src/styles.css` | `codex/ahead-chore-repo-preflight-shadow-20261007` | `codex/ahead-chore-repo-preflight-shadow-20261007/src/styles.css` |  |
| `.github/workflows/ai-ratchet-gate.yml` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/.github/workflows/ai-ratchet-gate.yml` |  |
| `.github/workflows/repo-preflight-consistency.yml` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/.github/workflows/repo-preflight-consistency.yml` |  |
| `.repo-preflight-consistency.json` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/.repo-preflight-consistency.json` |  |
| `CONTRIBUTING.md` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/CONTRIBUTING.md` |  |
| `PREFLIGHT.md` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/PREFLIGHT.md` |  |
| `README.md` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/README.md` |  |
| `docs/DEPENDENCIES.md` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/docs/DEPENDENCIES.md` |  |
| `docs/HUMAN_REVIEW.md` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/docs/HUMAN_REVIEW.md` |  |
| `requirements-tools.txt` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/requirements-tools.txt` |  |
| `src/App.jsx` | `cursor/docs-post-merge-preflight-3e94` ほか1 | `cursor/docs-post-merge-preflight-3e94/src/App.jsx` |  |
| `src/App.test.jsx` | `cursor/docs-post-merge-preflight-3e94` ほか1 | `cursor/docs-post-merge-preflight-3e94/src/App.test.jsx` |  |
| `tests/operational-gates.test.mjs` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/tests/operational-gates.test.mjs` |  |
| `tools/run_repo_preflight.py` | `cursor/docs-post-merge-preflight-3e94` | `cursor/docs-post-merge-preflight-3e94/tools/run_repo_preflight.py` |  |

## 伏せたもの

- なし
