# Capability Atlas

複数のAIランタイムについて、「見つかった」「入っている」「接続済み」「実際に試した」「運用で使った」を分けて観察する、ローカルファーストの能力導入・検証ハーネスです。

## 画面の考え方

1. 能力地図で、AIごとの利用可能面積を見る。
2. セルを選び、更新差分と未採用理由を証拠付きで確認する。
3. 外部副作用のない1タスクだけを安全実験として計画する（現MVPは実行しない）。
4. 認証、設定変更、push、プルリクエスト、公開、外部送信、課金は人間レビューで止める。

表示中のUIデータはMVP用サンプルです。現在のローカル環境を実測した値ではありません。

## 開発

```bash
npm install
npm test
npm run dev
```

## 検証

```bash
npm run verify
npm run smoke:ops
```

`npm run verify` は Vitest UIテスト、operations-runner、運用ゲート契約テスト、Sites用build、workerテストを含みます。`smoke:ops` は fixture から最大3件の短期計画を作り `artifacts/evidence/` へJSON証跡を保存します（`planned=true` / `executed=false`）。

## 自走ループ

```text
inventory → diff → classify → safe smoke → evidence → human review → observation
```

未知の操作は自動許可せず、`blocked_unknown` へ送ります。

## 運用ゲート（依存消費）

検査エンジンや判断OSは複製しません。**正本は [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)** です。

```bash
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .
python tools/run_repo_preflight.py --repo .
```

これらの `pass` は merge / public / visibility 変更の承認ではありません。

## 現在の境界

- 実装済み: 状態モデル、Safety router、統合UI、fixture collector、有界planner、JSON計画証跡、`run-once`、製品CI workflow 定義（`npm run verify` / `smoke:ops`）、preflight/ratchet 配線（`repository-guarantees.yml`・workflow_dispatch のみ）。remote Actions の成否はこの文書では主張しない。
- 未実装: 実環境コレクター、操作executor、スケジューラー、実インストール。
- 実行しない（自動）: 認証情報取得、設定変更、外部送信、GitHub操作、課金、merge、public。
