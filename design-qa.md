# Design QA

- source visual truth: `design/reference/capability-atlas-integrated.png`
- target viewport: `1488 x 1058`
- implementation screenshot: `unknown`
- state: Codex × テスト実行を選択した能力マップ
- primary interaction: 安全実験プレビュー → ローカル実験完了証跡

## 実測できたこと

- 参照画像を原寸で確認した。
- Reactコンポーネントテストで、安全実験のプレビュー、境界表示、実験完了証跡を確認した。
- Vite production build と Sites worker test が成功した。

## 比較した項目

| 項目 | 参照画像 | 実装 | 判定 |
|---|---|---|---|
| 画面骨格 | 上部バー、左ナビ、能力表、右インスペクター | 同じ4面構成 | 一致 |
| 見出し | 能力マップ（ライフサイクル別） | 同文言へ修正 | 一致 |
| 操作部 | 能力選択、検索、フィルター | 選択と検索は動作、フィルター外観を追加 | 部分一致 |
| 状態色 | 青、緑、黄、赤、灰 | 同系統の状態色 | 一致 |
| 安全境界 | 認証、push、公開、課金等を明示 | 右ペインに同境界を維持 | 一致 |
| 安全実験 | 実行前プレビュー | プレビューとローカル完了証跡 | 実装拡張 |
| レスポンシブ | デスクトップ中心 | 1180/900/680pxで段階的に縮退 | コード確認のみ |

## 未確認

- アプリ内ブラウザは `Transport closed` で接続できなかった。
- Edge headlessの代替撮影も画像ファイルを生成しなかった。
- このため、実装画面のピクセル比較、実ブラウザのconsole error、モバイル実画像は未確認。

## 人間レビューの判断材料

1. 右ペインの情報密度が参照画像と同程度か。
2. 能力表の列幅と文字サイズが読みやすいか。
3. 新しい完了証跡を右ペイン内に常設してよいか。
4. 能力フィルターを次工程で実動作へ進めるか。

## 判定

local implementation: pass

automated verification: pass

visual E2E: unknown
