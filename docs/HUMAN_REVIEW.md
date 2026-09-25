# 人間レビュー判断材料

## 今回レビューするもの

- 統合導線が「全体把握 → 原因確認 → 安全実験の計画（実行しない）」になっているか。
- 状態の意味が、色だけに依存せず理解できるか。
- 事実・推論・不明が混ざって見えないか。
- 人間レビュー境界が不足していないか。
- 運用ゲート配線（preflight / ratchet）が依存消費であり、検査エンジンの複製でないか。
- README / PREFLIGHT / DEPENDENCIES が実装実態と一致しているか（vapor claimがないか）。
- 開発保証スイート（`repository-guarantees.yml` 一本化）が上流消費のままか。

## 次フェーズで承認が必要なもの

1. 実環境コレクターが読むパスとコマンド。
2. 自動スモークのallowlistと操作executor。
3. 定期実行の頻度と証跡保持期間。

## 人間ゲート（現状）

- 製品 MVP（PR #1 → `main` @ `3a244ae`）: **merge 完了**。CI 成功 ≠ merge 承認の原則は維持。
- 本 PR #4（repo-preflight / ai-ratchet-gate 契約載せ）: **merge はまだ人判断**（current-turn 明示承認が必要）。手元 gate の `pass` は merge 承認ではない。
- public / visibility: merge とは **別承認・未実施**。

## 現在は承認対象外（自動実行しない）

公開、外部共有、認証、設定変更、課金、外部API呼び出し、GitHub操作の自動実行は実装していません。CI成功や preflight `pass` を人間承認の代替にしません。
