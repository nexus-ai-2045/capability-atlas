# Capability Atlas

複数のAIランタイムについて、「見つかった」「入っている」「接続済み」「実際に試した」「運用で使った」を分けて観察する、ローカルファーストの能力導入ハーネスです。

## 画面の考え方

1. 能力地図で、AIごとの利用可能面積を見る。
2. セルを選び、更新差分と未採用理由を証拠付きで確認する。
3. 外部副作用のない1タスクだけを安全実験として実行する。
4. 認証、設定変更、push、プルリクエスト、公開、外部送信、課金は人間レビューで止める。

表示中のデータはMVP用サンプルです。現在のローカル環境を実測した値ではありません。

## 開発

```powershell
npm install
npm test
npm run dev
```

## 検証

```powershell
npm test
npm run build
npm run test:sites
```

## 自走ループ

将来の収集アダプターは、次の順序を崩さず実装します。

```text
inventory → diff → classify → safe smoke → evidence → human review → observation
```

未知の操作は自動許可せず、`blocked_unknown`へ送ります。

## 現在の境界

- 実装済み: 状態モデル、危険操作ルーティング、統合UI、安全実験プレビュー。
- 未実装: 実環境コレクター、コマンド実行、永続証跡、スケジューラー。
- 実行しない: 認証情報取得、設定変更、外部送信、GitHub操作、課金操作。
