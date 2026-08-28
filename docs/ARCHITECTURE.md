# アーキテクチャ

## 状態モデル

`discovered → installed → wired → enabled → loaded → smoke_tested → adopted → observed`

状態は証拠がある隣接段階へだけ進みます。インストール済みという事実だけで、読み込み済み・採用済みとは判定しません。

## 構成

- Inventory adapters: 各AIのローカル状態を読み取り専用で収集する。
- Normalizer: 異なるAIの概念を共通能力と状態へ変換する。
- Diff engine: 前回観測と比較し、追加・後退・不明化を原子的に記録する。
- Safety router: 操作を`safe_local`、`human_review`、`blocked_unknown`へ振り分ける。
- Smoke runner: 現MVPでは有界な次手を計画して証拠を保存する。将来executor導入後も1操作だけ実行する。
- Atlas UI: 地図、理由、実験、人間レビューを一続きで表示する。

運用MVPは、状態モデル、Safety router、Atlas UIに加えて、fixture collector、決定的な短期planner、snapshot差分、drift分類、原子的なJSON計画証跡、`run-once`入口までを対象にします。操作executor、定期実行、実インストールは運用MVPの外側で、人間レビュー後に既存runner・schedulerへ接続します。

## MPCとFDEの役割

- MPC（モデル予測制御）型ループ: 最大3候補を短く先読みし、現MVPでは次の1操作を計画する。将来executor導入後は1操作だけ実行して再計画する。正式な数理MPC solverは導入しない。
- Fractal Decision Ecosystem（FDE）: 判断OSの外部正本（`nexus-ai-2045/fractal-decision-ecosystem`）。このrepoでは探索軸の縮約参考として参照し、第二フレームワークを置かない。
- lifecycleと`freshness / health / drift / evidenceStatus`は直交させ、状態数の爆発を防ぐ。

詳細は[運用契約](./OPERATIONS.md)、[外部契約](./DEPENDENCIES.md)、ADRを参照してください。
