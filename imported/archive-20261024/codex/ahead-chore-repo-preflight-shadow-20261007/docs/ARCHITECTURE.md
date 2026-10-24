# アーキテクチャ

## 状態モデル

`discovered → installed → wired → enabled → loaded → smoke_tested → adopted → observed`

状態は証拠がある隣接段階へだけ進みます。インストール済みという事実だけで、読み込み済み・採用済みとは判定しません。

## 構成

- Inventory adapters: 各AIのローカル状態を読み取り専用で収集する。
- Normalizer: 異なるAIの概念を共通能力と状態へ変換する。
- Diff engine: 前回観測と比較し、追加・後退・不明化を原子的に記録する。
- Safety router: 操作を`safe_local`、`human_review`、`blocked_unknown`へ振り分ける。
- Smoke runner: 有界な1タスクを実行して証拠を保存する。
- Atlas UI: 地図、理由、実験、人間レビューを一続きで表示する。

現在のMVPは状態モデル、Safety router、Atlas UIまでを実装しています。
