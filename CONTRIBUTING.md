# コントリビューション

Capability Atlas は local-first の能力導入・検証ハーネスです。変更は小さく、既存契約を消費し、第二の判断OSや検査エンジンをこのリポジトリへ複製しないでください。

## 基本方針

- 先に境界と完了条件を固定する。公開・merge・visibility 変更は人間承認が必要。
- `repo-preflight` / `ai-ratchet-gate` / FDE / engineering-brain の正本は外部リポジトリ。ここへロジックをコピーしない。
- 未知操作は `blocked_unknown`。推測で許可しない。
- 失敗するテストを先に足し、根因を直し、対症療法で止めない。

## ローカル検証

```bash
npm ci
npm run verify
npm run smoke:ops
```

運用ゲート（Python 3.11+）:

```bash
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .
python tools/run_repo_preflight.py --repo .
```

- `ai-ratchet-gate` は PyPI 名では入れない（Release wheel URL + hash のみ）。
- `tools/run_repo_preflight.py` は upstream `nexus-ai-2045/repo-preflight` を `.tools/repo-preflight` へ clone して実行する。
- consistency は当面 `shadow`。所見は観測材料であり、merge 承認ではない。

## PR 本文

日本語で次を書く: 概要 / 検証 / 境界 / 残る人間判断（merge と public は別承認）。
