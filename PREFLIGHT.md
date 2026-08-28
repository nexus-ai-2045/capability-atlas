<!-- repo-preflight:review-record -->

# 公開準備状況

- HEAD: `b608c16c`（`codex/operational-mvp` 先端）
- 確認日時: 2026-08-28
- 判定: `blocked`（human review / merge 承認待ち。public は別承認）

## 確認済み

- [x] README / LICENSE / SECURITY.md / CONTRIBUTING.md
- [x] PREFLIGHT.md（本ファイル）
- [x] `npm run verify` / `npm run smoke:ops`（ローカル）
- [x] ai-ratchet-gate baseline（`.ai-ratchet-gate/baseline.txt`、導入時 0 件）
- [x] repo-preflight consistency `mode=shadow`（`.repo-preflight-consistency.json`）
- [x] 外部契約ポインタの正本は [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)
- [ ] secret / personal path / history（repo-preflight readiness_scan の所見を人間が確認）
- [ ] remote CI runtime evidence（現在は org billing/spending limit で job 未起動）
- [ ] operations / monitoring / rollback（実collector・scheduler は未実装のまま・本PR範囲外）

## 機械ゲート

入口・CI 配線・保証しないことの正本: [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)

```bash
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .
python tools/run_repo_preflight.py --repo .
npm run verify
npm run smoke:ops
```

## 人間目視

- reviewer:
- reviewed_at:
- exact HEAD / PR diff: `07857502238c5a689c973d7e736965fba4c8864d`
- decision: `approve / changes_requested`
- 残余リスク: 実collector未実装、executor未実装、scheduler未接続、public未承認、remote CI は billing 復旧待ち
- 次に承認する正確な操作: **merge**（current-turn 明示承認）。**public / visibility** は別承認。

## PR本文（日本語）

### 概要

- 有界な再計画ループ（fixture観測 → 差分/drift → 最大3候補計画 → JSON証跡）
- 運用保証を依存として配線: upstream `repo-preflight` / Release固定 `ai-ratchet-gate`（ロジック非コピー）
- FDE は外部判断OSポインタのみ。第二フレームワーク / 第二SSOTなし
- 文書を実装実態へ整合。main #2 の shadow consistency を取り込み拡張

### 検証

- ローカル: `npm run verify` / `smoke:ops`（`planned=true` / `executed=false`）/ ratchet 0/0 / preflight consistency `pass`（shadow）
- remote Actions: billing/spending limit により未起動（コード失敗ではない）。復旧後に再実行

### 境界

- 実collector・executor・scheduler・実インストールは無効
- 検査エンジン非コピー、秘密情報非掲載、GitHub/公開の自動操作なし

### 残る人間判断

- merge（明示承認）
- public / visibility（別承認）
- Actions billing 復旧と remote CI 再実行
- UI目視と readiness の人間確認
