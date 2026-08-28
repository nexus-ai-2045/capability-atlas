<!-- repo-preflight:review-record -->

# 公開準備状況

- HEAD: `codex/operational-mvp` の最新 commit
- 確認日時: PR 更新時
- 判定: `blocked`（human review / merge 承認待ち。public は別承認）

## 確認済み

- [x] README / LICENSE / SECURITY.md / CONTRIBUTING.md
- [x] PREFLIGHT.md（本ファイル）
- [x] `npm run verify` / `npm run smoke:ops`
- [x] ai-ratchet-gate baseline（`.ai-ratchet-gate/baseline.txt`、導入時 0 件）
- [x] repo-preflight consistency `mode=shadow`（`.repo-preflight-consistency.json`）
- [ ] secret / personal path / history（repo-preflight readiness_scan の所見を人間が確認）
- [ ] dependency / CI runtime evidence の人間確認
- [ ] operations / monitoring / rollback（実collector・scheduler は未実装のまま）

## 機械ゲート

```bash
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .
python tools/run_repo_preflight.py --repo .
npm run verify
npm run smoke:ops
```

- `ai-ratchet-gate` は PyPI 名では入れない（Release wheel URL のみ）。
- `tools/run_repo_preflight.py` は upstream `nexus-ai-2045/repo-preflight` を呼び出す薄いラッパ。検査ロジックはコピーしない。
- consistency は当面 `shadow`。所見は観測し、merge 承認には使わない。
- readiness_scan の `pass` / `blocked` は機械範囲のみ。push / PR / merge / visibility 変更の承認ではない。

## 人間目視

- reviewer:
- reviewed_at:
- exact HEAD / PR diff:
- decision: `approve / changes_requested`
- 外から見える files と commit history:
- 残余リスク: 実collector未実装、executor未実装、scheduler未接続、public未承認
- 次に承認する正確な操作: merge（current-turn 明示承認が必要）。public / visibility 変更は別承認。
