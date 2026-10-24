<!-- repo-preflight:review-record -->

# 公開準備状況

- 確認済み基準: プルリクエスト `#1` のマージコミット `3a244ae`（本書更新時の `HEAD` でも、プルリクエスト `#3` の現在の `head SHA` でもない）
- 確認日時: 2026-09-21
- 判定: `blocked`（プルリクエスト `#1` はマージ済み。残余: `readiness_scan` の人による確認 / 遠隔 `CI` の課金 / 公開は別承認）

## 基準コミットでの確認済み項目

- ☑ `README` / `LICENSE` / `SECURITY.md` / `CONTRIBUTING.md`
- ☑ `PREFLIGHT.md`（本ファイル）
- ☑ `npm run verify` / `npm run smoke:ops`（ローカル実行）
- ☑ `ai-ratchet-gate` の基準（`.ai-ratchet-gate/baseline.txt`、導入時は `0` 件）
- ☑ `repo-preflight` の整合性 `mode=shadow`（`.repo-preflight-consistency.json`）
- ☑ 外部契約ポインタの正本は [依存関係文書](docs/DEPENDENCIES.md)
- ☐ 機密情報 / 個人パス / 履歴（`repo-preflight` の `readiness_scan` 所見を人が確認）
- ☐ 遠隔 `CI` の実行証跡（現在は組織の課金 / 利用上限によりジョブ未起動）
- ☐ 運用 / 監視 / 復旧（実収集器・スケジューラーは未実装で、本プルリクエストの範囲外）

## 機械判定ゲート

入口・`CI` 配線・保証対象外の正本: [依存関係文書](docs/DEPENDENCIES.md)

```bash
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .
python tools/run_repo_preflight.py --repo .
npm run verify
npm run smoke:ops
```

## 人による目視確認

- 確認者:
- 確認日時:
- 確認対象: この文書更新を含むプルリクエスト `#3` の差分。実際の `head SHA` は `GitHub` のプルリクエスト画面で確認する。人による確認結果は未記録。
- 判定: `approve / changes_requested`
- 残余リスク: 実収集器未実装、実行器未実装、スケジューラー未接続、公開未承認、遠隔 `CI` は課金復旧待ち
- 次に承認する正確な操作: **公開範囲の変更**（別承認）。プルリクエスト `#1` のマージは完了済み。本書更新のプルリクエスト `#3` は未マージ。

## プルリクエスト本文（日本語）

### 概要

- 上限付きの再計画ループ（`fixture` の観測 → 差分とずれ → 最大3候補の計画 → `JSON` 証跡）
- 運用保証を依存関係として配線: 上流の `repo-preflight` / リリースを固定した `ai-ratchet-gate`（ロジックは複製しない）
- `FDE` は外部判断基盤への参照のみ。第二の枠組み / 第二の正本なし
- 文書を実装実態に整合。`main` の `#2` にある `shadow consistency` を取り込み拡張

### 検証

以下は既存の検証記録であり、今回の文書修正による再実行結果ではない。

- ローカル実行: `npm run verify` / `smoke:ops`（`planned=true` / `executed=false`）/ `ratchet` `0/0` / `preflight` の整合性 `pass`（`shadow`）
- 遠隔の `Actions`: 課金 / 利用上限により未起動（コードの失敗ではない）。復旧後に再実行

### 境界

- 実収集器・実行器・スケジューラー・実導入は無効
- 検査エンジンを複製せず、秘密情報を記載せず、`GitHub` 操作 / 公開の自動実行なし

### 残る人間判断

- マージ: 完了（プルリクエスト `#1` → `main` @ `3a244ae`）
- 公開範囲の変更（別承認・未実施）
- `Actions` の課金復旧と遠隔 `CI` の再実行
- `UI` の目視と準備状況の人による確認
