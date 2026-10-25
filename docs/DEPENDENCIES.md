# 外部契約（正本ポインタ）

このリポジトリは Capability Atlas の製品実装を持つ。検査エンジン・判断OS・運用SSOTの正本は外部に置き、ここへ複製しない。

| 契約 | 正本 | この repo での扱い |
|---|---|---|
| repo-preflight | [nexus-ai-2045/repo-preflight](https://github.com/nexus-ai-2045/repo-preflight) pin `5b7c774deb8e9abcf0fce0c5f39ec1c1f3a894f3`（`v0.10.0`） | `tools/run_repo_preflight.py`（手元から呼ぶ）が公開上流からこのcommitだけを実行時に取り寄せ、取得commit idとtagの指す先を照合し、全memberを検査して安全展開して実行。repoへ同梱しない。新credential不要。スキャナ本体は手編集しない |
| ai-ratchet-gate | [nexus-ai-2045/ai-ratchet-gate](https://github.com/nexus-ai-2045/ai-ratchet-gate) 0.2.0 のリリース待ち | 公開取得元（Release / PyPI）が無いため現在は固定できる配布物が無い。repoへ同梱しない。公開後に`requirements-tools.txt`へRelease wheel URL+SHA-256で固定する。それまで手元のratchet手順はfail-closed。既存は baseline、新規 tracked∧ignored のみ fail-closed |
| Fractal Decision Ecosystem（FDE） | [nexus-ai-2045/fractal-decision-ecosystem](https://github.com/nexus-ai-2045/fractal-decision-ecosystem) | 判断OSのポインタのみ。第二フレームワークを発明しない |
| engineering-brain | [nexus-ai-2045/engineering-brain](https://github.com/nexus-ai-2045/engineering-brain) | run / research / closeout / PR packet 組立に使う。散文で保証を偽らない |
| nexus-management-os / nexus_ai | メインライン ops / SSOT | 第二SSOTをこの repo に作らない |
| github-ops | 既存の GitHub 運用契約（独立リポジトリ名ではない） | 新しい comment-resolution プロトコルを追加しない |

## ローカル実行入口

```bash
python -m pip install --require-hashes -r requirements-tools.txt
python -m ai_ratchet_gate --repo .
python tools/run_repo_preflight.py --repo .
```

`.tools/` は gitignore。Actions の開発保証は必須チェック `all-green`（`.github/workflows/preflight.yml` → repo-preflight の preflight-gate を pin SHA で呼ぶ。検査ロジック非コピー）で見る。専用 workflow（旧 `repository-guarantees.yml`）は検査が重なるため外した。

製品 CI（`.github/workflows/ci.yml`）へ開発保証パッケージは埋め込まない。手元同等手順の正本は [PREFLIGHT.md](../PREFLIGHT.md)。

## 保証しないこと

- preflight / ratchet の `pass` は merge・public・visibility 変更の承認ではない。
- FDE ポインタは判断軸の縮約参考であり、この repo 内に FDE runtime を同梱しない。
- Capability Atlas の `npm run smoke:ops` は計画証跡のみで、candidate 操作は実行しない。
