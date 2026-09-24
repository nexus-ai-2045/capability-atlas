<!-- repo-preflight:review-record -->

# 公開準備状況

- repository: `nexus-ai-2045/capability-atlas`
- HEAD: `main`（PR #1 merge 済み）+ 本 PR の開発保証スイート載せ替え
- 確認日時: 2026-09-24
- 判定: `blocked`（human review / merge 承認待ち。public は別承認）

## 開発保証ゲート

検査ロジックは本リポジトリへコピーしない。上流を直接呼ぶ。`engineering-brain` は埋め込まない。

| 契約 | 上流 | 設定 | 扱い |
|---|---|---|---|
| 文書・実装の宣言整合 | `nexus-ai-2045/repo-preflight`（pin SHA `f825268978228a3cfb2f5ecba16a74d424134b1a`） | `.repo-preflight-consistency.json`（`shadow`） | `consistency_gate` + `readiness_scan`。shadow 所見は止めない。`tool_error` は fail-closed |
| tracked ∧ ignored の新規悪化 | `nexus-ai-2045/ai-ratchet-gate` v0.1.1（wheel + SHA-256） | `.ai-ratchet-gate/baseline.txt` | 既存分は grandfather。baseline に無い新規だけ deny |

入口・保証しないことの正本: [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)

### トリガ方針（Actions 課金）

- 開発保証 workflow（`repository-guarantees.yml`）は **`workflow_dispatch` のみ**。`pull_request` / `push` では起動しない
- `workflow_dispatch` で BASE と HEAD が同一（空 diff）のときは差分検査を緑にしない（fail-closed）
- 製品 CI（`.github/workflows/ci.yml`）は別契約。開発保証パッケージは埋め込まない

### 手元同等の確認手順

feature 枝で `origin/main` との差分がある状態で実行する（`BASE==HEAD` は意図的に失敗させる）。

```bash
# 1) ai-ratchet-gate（tracked∧ignored の新規悪化だけ deny）
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .

# 2) repo-preflight（上流 pin。検査ロジックはコピーしない）
#    ローカル入口: tools/run_repo_preflight.py（同じ SHA を fetch）
python tools/run_repo_preflight.py --repo .

# または workflow と同等の明示手順:
REPO_PREFLIGHT_SHA=f825268978228a3cfb2f5ecba16a74d424134b1a
git clone --no-checkout https://github.com/nexus-ai-2045/repo-preflight.git /tmp/repo-preflight
git -C /tmp/repo-preflight checkout --detach "$REPO_PREFLIGHT_SHA"
test "$(git -C /tmp/repo-preflight rev-parse HEAD)" = "$REPO_PREFLIGHT_SHA"

git fetch origin main
BASE="$(git rev-parse origin/main)"
HEAD="$(git rev-parse HEAD)"
test "$BASE" != "$HEAD"  # 空diff fail-closed

python /tmp/repo-preflight/scripts/consistency_gate.py \
  --repo . --base-ref "$BASE" --require-config --require-mode shadow --json

python /tmp/repo-preflight/scripts/readiness_scan.py \
  --repo . --release --consistency-base-ref origin/main

# 3) 製品側
npm run verify
npm run smoke:ops
```

Actions で同等確認する場合は、feature 枝を選んで `repository-guarantees` を `workflow_dispatch` する（default branch 直上だと空 diff で fail-closed）。

## 確認済み

- [x] README / LICENSE / SECURITY.md / CONTRIBUTING.md
- [x] PREFLIGHT.md（本ファイル）
- [x] `npm run verify` / `npm run smoke:ops`（ローカル）
- [x] ai-ratchet-gate baseline（`.ai-ratchet-gate/baseline.txt`、導入時 0 件）
- [x] repo-preflight consistency `mode=shadow`（`.repo-preflight-consistency.json`）
- [x] 開発保証を `repository-guarantees.yml`（workflow_dispatch のみ・空diff fail-closed・pin SHA）へ一本化
- [x] 外部契約ポインタの正本は [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)
- [ ] secret / personal path / history（repo-preflight readiness_scan の所見を人間が確認）
- [ ] remote CI runtime evidence（現在は org billing/spending limit で job 未起動の可能性）
- [ ] operations / monitoring / rollback（実collector・scheduler は未実装のまま・本PR範囲外）

## 人間目視

- reviewer:
- reviewed_at:
- exact HEAD / PR diff: 本 PR の最新 head SHA
- decision: `approve / changes_requested`
- 残余リスク: 実collector未実装、executor未実装、scheduler未接続、public未承認、remote Actions は課金状況に依存
- 次に承認する正確な操作: **merge**（current-turn 明示承認）。**public / visibility** は別承認。

## PR本文（日本語）

### 概要

- 既存の repo-preflight / ai-ratchet-gate 開発保証を、ai-round-table #29 と同型の吸収パターンへ載せ替え
- `repository-guarantees.yml`（workflow_dispatch のみ・空diff fail-closed・上流 pin SHA）
- 検査ロジック非コピー。製品 CI（`ci.yml`）は触らない

### 検証

- ローカル: ratchet / consistency（shadow）/ `npm run verify`（本 PR で実測）
- remote Actions: 課金状況に依存。復旧後は feature 枝で `workflow_dispatch`

### 境界

- Settings / billing / required checks / merge / visibility / LICENSE は変更しない
- 新フレームワーク・新 gate 種別・新 workflow 種別は追加しない

### 残る人間判断

- merge（明示承認）
- public / visibility（別承認）
- Actions 実走の人間確認
