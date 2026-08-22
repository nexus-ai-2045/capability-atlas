# ADR-0001: 有界な再計画ループによる安全運用

- 状態: 提案
- 日付: 2026-08-22
- 対象: Capability Atlasのローカル観測・差分・安全スモーク

## 文脈

Capability Atlasは、複数のAIランタイムに存在する能力を観測し、証拠に基づいて安全な1タスク実験へ進める。全能力・全パラメータ・全操作を一度に実行すると、組合せ数、実行コスト、外部副作用のリスクが増える。また、観測結果が変わった後も古い計画を実行し続けると、計画と実環境の不一致を見逃す。

モデル予測制御（Model Predictive Control: MPC）は、現在状態を起点に有限ホライズンの制約付き計画を解き、最初の操作だけ適用して、次の観測で再計画する制御方式である。MPCの定義と制約処理はMayneらのレビュー、再計画の説明はMesbahの概説を参照する。

- [Mayne et al., Constrained model predictive control: Stability and optimality](https://doi.org/10.1016/S0005-1098(99)00214-9)
- [Mesbah, Stochastic Model Predictive Control](https://escholarship.org/uc/item/1wt3d4vr)

## 決定

正式なMPCソルバーや制御理論上の安定性保証を導入するのではなく、MPCの運用上有効な性質を「有界な再計画ループ」として採用する。

```text
snapshot → diff/drift → bounded plan → 1操作だけ実行
         → evidence → 再観測 → 次の計画
```

### 状態と操作

- 状態は、能力のlifecycleと、直交する`evidenceStatus`、`freshness`、`health`、`drift`、`route`で表す。
- 計画は最大3候補に制限する。
- 候補は優先度を降順、同点はIDを昇順にして決定的に並べる。
- 候補のruntime/genre（または明示された`diversityKey`）が重複しないものを先に選び、代表性を確保する。
- 実行後は必ず再観測し、残りの計画をそのまま実行しない。

### ハード制約とfail-closed

自動実行できる操作は、明示された`inventory_read`または`local_read_smoke`だけとする。次の条件を1つでも満たす候補は計画から除外する。

- network、auth、settings mutation、file write、external send、paid action
- 対象またはscopeが未指定
- 入力サイズまたは実行時間が有界値を超える
- 操作種別が未知

安全な候補が1件もない場合は、`blocked_unknown`を返し、推測で実行しない。

### 証拠とprovenance

証拠は操作、actor、target、開始・終了時刻、終了コード、出力要約、変更ファイル、scope、入力ハッシュを含む。証拠の概念モデルはW3C PROVのentity/activity/agent/time/derivationに合わせる。

- [W3C PROV Model Primer](https://www.w3.org/TR/prov-primer/)

SLSA/in-totoは、実行材料、実行主体、手順、生成物、検証の関係を設計する参考にする。ただし、MVPでは署名付きサプライチェーン検証を実装せず、ローカルの有界なJSON証拠とハッシュを先に採用する。

- [SLSA Build Provenance](https://github.com/slsa-framework/slsa/blob/main/spec/build-provenance.md)
- [in-toto specification](https://github.com/in-toto/specification/blob/master/in-toto-spec.md)

### 次元の縮約と代表smoke

FDEの軸を単一の巨大な状態ベクトルにしない。最初にruntime・capability・operationのscopeを固定し、risk、uncertainty、staleness、novelty、blast radiusで候補を絞る。通常の組合せ検査は2-way、高リスクだけ3-wayとする。

NISTは、全組合せではなく少数パラメータの相互作用をcovering arrayで圧縮する方法を示している。active learningからは、不確実性だけでなく候補の多様性も考慮して次の観測を選ぶ考え方だけを取り入れる。

- [NIST Combinatorial Testing](https://www.nist.gov/publications/combinatorial-testing)
- [NIST SP 800-142, Practical Combinatorial Testing](https://csrc.nist.gov/pubs/sp/800/142/final)
- [Gentile et al., Fast Rates in Pool-Based Batch Active Learning](https://jmlr.org/papers/v25/22-1409.html)

## 代替案

### 完全な数理MPCソルバー

不採用。現在の対象は物理系の連続状態ではなく、ローカル能力・証拠・操作境界の離散状態である。現時点で最適化ソルバーを導入することは、依存、検証負荷、説明責任を増やすが、MVPの安全性を増やさない。

### 全組合せのE2E

不採用。組合せ爆発と外部副作用の検証コストが大きい。NISTのcovering arrayと有界な代表smokeを採用する。

### 機械学習によるactive learner

保留。観測データとラベルが不足するため、初期は決定的な優先度と多様性制約で十分である。将来、実測データが蓄積された場合のみ、選択器を比較実験する。

### lifecycleへの`stale`/`drifted`状態の追加

不採用。状態数が増えて遷移の意味が混ざるため、既存lifecycleは維持し、鮮度・health・driftを直交属性として持つ。

## 結果と運用保証

- 状態遷移は証拠がある隣接段階だけに限定する。
- `adopted`への遷移は人間レビューを必要とする。
- `stale`、`unknown`、collector failure、driftは、保守的にholdまたはhuman reviewへ送る。
- `run-once`を先に安定させ、定期実行は実測証拠と人間承認の後に追加する。
- planner、diff、drift、routerは純粋関数としてテスト可能にする。
- 公開、認証、設定変更、GitHub操作、外部送信、課金はこのADRの自動実行範囲外である。

## 検証

このADRに対応する純粋関数のTDDは、次のテストで実施する。

- snapshotのadded/removed/changed/unchanged差分
- permission/state regression、evidence stale、collector failureのdrift
- lifecycleと直交属性の独立性
- 最大3候補、決定的順序、多様性
- unknown operationおよびhard constraint違反のfail-closed
