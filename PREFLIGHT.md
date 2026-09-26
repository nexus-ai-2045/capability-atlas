<!-- repo-preflight:review-record -->

# 公開準備状況

- repository: `nexus-ai-2045/capability-atlas`
- 確認済み基準（製品 MVP）: PR `#1` のマージコミット `3a244ae`（`main` 上）
- 開発保証スイート: PR `#4` → `main` @ `17ae591`（**merge 完了**・2026-09-26）
- 確認日時: 2026-09-27
- 判定: `blocked`
  - PR `#1` / `#4` は merge 済み
  - PR `#3` は close 済み（superseded）
  - 開いている PR: 0
  - 残余: `readiness_scan` の人による確認 / 遠隔 CI の課金・実行証跡
  - public / visibility: **実施済み**（リポジトリは現時点で public）

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
- [x] PR `#1` → `main` @ `3a244ae` の merge 完了（製品 MVP）
- [x] PR `#4` → `main` @ `17ae591` の merge 完了（開発保証スイート）
- [x] PR `#3` の close 完了（superseded）
- [ ] secret / personal path / history（`readiness_scan` の所見を人が確認）
- [ ] remote CI runtime evidence（組織の課金 / 利用上限によりジョブ未起動の可能性）
- [ ] operations / monitoring / rollback（実collector・scheduler は未実装のまま・本PR範囲外）
- [x] public / visibility（実施済み。現時点で public）

## 人間目視

- reviewer:
- reviewed_at:
- exact HEAD / PR diff: 対象 PR の最新 head SHA（GitHub の PR 画面で確認）
- decision: `approve / changes_requested`
- 残余リスク: 実collector未実装、executor未実装、scheduler未接続、遠隔 CI は課金状況に依存
- 次に承認する正確な操作: **なし（public / visibility は実施済み）**。「#4 merge待ち」ではない。PR `#1` / `#4` の merge は完了済み。残余は `readiness_scan` 所見・Actions 実走・operations 系の人間確認。

## 文書統合メモ

- docs のみの PR `#3`（`cursor/docs-post-merge-preflight-3e94`）の事実更新は PR `#4` へ吸収済み。`#3` は 2026-09-26 に close 済み（superseded）。
- PR `#4`（`cursor/repository-guarantees-suite-f2e0`）は 2026-09-26 に merge 済み。開いている PR は 0。

## 残る人間判断

- public / visibility: **実施済み**（現時点で public）※残判断ではない
- `readiness_scan` 所見の人間確認
- Actions 実走の人間確認
- operations / monitoring / rollback（実装後の別承認）
