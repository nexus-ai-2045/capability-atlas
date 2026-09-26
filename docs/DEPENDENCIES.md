# 外部契約（正本ポインタ）

このリポジトリは Capability Atlas の製品実装を持つ。検査エンジン・判断OS・運用SSOTの正本は外部に置き、ここへ複製しない。

| 契約 | 正本 | この repo での扱い |
|---|---|---|
| repo-preflight | [nexus-ai-2045/repo-preflight](https://github.com/nexus-ai-2045/repo-preflight) pin `f825268978228a3cfb2f5ecba16a74d424134b1a` | `tools/run_repo_preflight.py` と `repository-guarantees.yml` が上流を fetch/実行。スキャナ本体は fork しない |
| ai-ratchet-gate | [nexus-ai-2045/ai-ratchet-gate](https://github.com/nexus-ai-2045/ai-ratchet-gate) Release `v0.1.1` | `requirements-tools.txt` で wheel+SHA-256 固定。既存は baseline、新規 tracked∧ignored のみ fail-closed |
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

`.tools/` は gitignore。開発保証 CI は上流流儀の専用 workflow で接続する（検査ロジック非コピー）:

- `.github/workflows/repository-guarantees.yml`（**workflow_dispatch のみ**。空 diff は fail-closed。repo-preflight は pin SHA、ai-ratchet-gate は Release wheel）

製品 CI（`.github/workflows/ci.yml`）へ開発保証パッケージは埋め込まない。手元同等手順の正本は [PREFLIGHT.md](../PREFLIGHT.md)。

## 保証しないこと

- preflight / ratchet の `pass` は merge・public・visibility 変更の承認ではない。
- FDE ポインタは判断軸の縮約参考であり、この repo 内に FDE runtime を同梱しない。
- Capability Atlas の `npm run smoke:ops` は計画証跡のみで、candidate 操作は実行しない。
