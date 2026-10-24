import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise,
  BookOpenText,
  CaretDown,
  ChartBar,
  Check,
  CircleDashed,
  Clock,
  Code,
  FileText,
  Funnel,
  GitBranch,
  GridFour,
  Info,
  Link,
  MagnifyingGlass,
  Package,
  PaperPlaneTilt,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  TerminalWindow,
  TestTube,
  X,
} from "@phosphor-icons/react";

const capabilities = [
  { key: "files", label: "ファイル操作", sub: "ローカルFS", icon: FileText },
  { key: "shell", label: "シェル実行", sub: "ローカル", icon: TerminalWindow },
  { key: "search", label: "コード検索", sub: "ripgrep", icon: MagnifyingGlass },
  { key: "test", label: "テスト実行", sub: "pytest", icon: TestTube },
  { key: "git", label: "Git操作", sub: "ローカル", icon: GitBranch },
  { key: "packages", label: "パッケージ管理", sub: "uv / pip", icon: Package },
];

const runtimes = [
  { name: "Codex", mark: ">_", states: ["adopted", "adopted", "adopted", "installed", "unknown", "observed"] },
  { name: "Claude", mark: "AI", states: ["adopted", "installed", "adopted", "wired", "unknown", "observed"] },
  { name: "Gemini", mark: "◆", states: ["installed", "installed", "wired", "unknown", "unknown", "observed"] },
  { name: "Grok", mark: "◎", states: ["installed", "unknown", "wired", "unknown", "unknown", "observed"] },
];

const catalogItems = [
  { name: "Playwright MCP", type: "MCP", genre: "ブラウザ・E2E", status: "未導入", score: "未測定", description: "ブラウザ操作と画面テストを接続します。" },
  { name: "security-guidance", type: "スキル", genre: "セキュリティ", status: "導入済み", score: "未測定", description: "変更前の安全境界とレビュー観点を提示します。" },
  { name: "Figma MCP", type: "MCP", genre: "デザイン", status: "接続済み", score: "未測定", description: "Figmaの設計情報を実装工程へ接続します。" },
];

const lifecycleStages = [
  { key: "discovered", label: "発見", icon: <Info /> },
  { key: "installed", label: "インストール済み", icon: <PaperPlaneTilt /> },
  { key: "wired", label: "ワイヤ済み", icon: <Link /> },
  { key: "enabled", label: "有効化", icon: <SlidersHorizontal /> },
  { key: "loaded", label: "読み込み済み", icon: <CircleDashed /> },
  { key: "smoke_tested", label: "スモーク済み", icon: <ShieldCheck /> },
  { key: "adopted", label: "採用", icon: <Check /> },
  { key: "observed", label: "観察中", icon: <ChartBar /> },
];

const stateMeta = {
  discovered: { label: "発見済み", symbol: <Info weight="bold" /> },
  installed: { label: "インストール済み", symbol: <PaperPlaneTilt weight="bold" /> },
  wired: { label: "ワイヤ済み", symbol: <Link weight="bold" /> },
  enabled: { label: "有効化済み", symbol: <SlidersHorizontal weight="bold" /> },
  loaded: { label: "読み込み済み", symbol: <CircleDashed weight="bold" /> },
  smoke_tested: { label: "スモーク済み", symbol: <ShieldCheck weight="bold" /> },
  adopted: { label: "採用済み", symbol: <Check weight="bold" /> },
  observed: { label: "観察中", symbol: <ChartBar weight="bold" /> },
};

const unknownEvidenceMeta = {
  label: "未確認（証拠なし）",
  symbol: <CircleDashed weight="bold" />,
};

function statePresentation(state) {
  return stateMeta[state] ?? unknownEvidenceMeta;
}

function StateCell({ state, selected, onClick, label }) {
  const meta = statePresentation(state);
  return (
    <button
      className={`state-cell state-${state} ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      aria-label={`${label}: ${meta.label}`}
    >
      <span className="state-symbol">{meta.symbol}</span>
    </button>
  );
}

function EvidenceTag({ type, children }) {
  return <span className={`evidence-tag evidence-${type}`}>{children}</span>;
}

export function App() {
  const [page, setPage] = useState("map");
  const [selected, setSelected] = useState({ runtime: 0, capability: 3 });
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [experimentResult, setExperimentResult] = useState(null);
  const [installTarget, setInstallTarget] = useState(null);
  const [installReviewRequested, setInstallReviewRequested] = useState(() => new Set());
  const [installReviewName, setInstallReviewName] = useState("");
  const [filter, setFilter] = useState("");
  const modalCloseRef = useRef(null);
  const modalTriggerRef = useRef(null);
  const modalWasOpenRef = useRef(false);
  const selectedCapability = capabilities[selected.capability];
  const filtered = useMemo(
    () => capabilities.map((item, index) => ({ ...item, index })).filter((item) => `${item.label}${item.sub}`.includes(filter)),
    [filter],
  );

  useEffect(() => {
    const modalOpen = experimentOpen || Boolean(installTarget);
    if (!modalOpen) {
      if (modalWasOpenRef.current) {
        modalWasOpenRef.current = false;
        modalTriggerRef.current?.focus();
      }
      return undefined;
    }

    modalWasOpenRef.current = true;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExperimentOpen(false);
        setInstallTarget(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    modalCloseRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [experimentOpen, installTarget]);

  const openExperiment = (event) => {
    modalTriggerRef.current = event.currentTarget;
    setExperimentOpen(true);
  };

  const openInstallReview = (item, event) => {
    modalTriggerRef.current = event.currentTarget;
    setInstallTarget(item);
  };

  const requestInstallReview = () => {
    if (!installTarget) return;
    setInstallReviewRequested((current) => new Set(current).add(installTarget.name));
    setInstallReviewName(installTarget.name);
    setInstallTarget(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><GridFour weight="fill" /><strong>Capability Atlas</strong></div>
        <div className="top-context">ローカルファースト・開発運用オペレーター向け</div>
        <div className="local-status"><span />ローカルのみ <Info /></div>
        <span className="data-status">サンプル・未実測</span>
        <div className="top-actions"><Clock /> 最終更新: 2026-07-31 13:52 <button><ArrowsClockwise />再読み込み</button></div>
      </header>

      <aside className="sidebar">
        <nav aria-label="メインナビゲーション">
          <button className={page === "map" ? "active" : ""} onClick={() => setPage("map")}><BookOpenText />概要マップ</button>
          <button className={page === "catalog" ? "active" : ""} onClick={() => setPage("catalog")}><Package />スキル・MCPカタログ</button>
          <button><ArrowsClockwise />変更ウォッチ <b>3</b></button>
          <button><TestTube />実験と証拠</button>
          <button><GridFour />境界ルール</button>
          <button><FileText />観察ログ</button>
          <button><SlidersHorizontal />設定</button>
        </nav>
        <div className="scope-box"><span />すべてローカル<small>外部送信なし</small></div>
        <button className="display-settings"><SlidersHorizontal />表示設定<CaretDown /></button>
        <button className="sidebar-help"><Info />ヘルプ</button>
      </aside>

      {page === "map" ? <main className="workspace">
        <section className="map-panel">
          <div className="section-head">
            <div>
              <h1>能力マップ（ライフサイクル別）</h1>
              <p>インストール済みでも、すべてのAIで自動的に使えるわけではありません。</p>
              <p className="sample-notice">表示中のデータはMVP用サンプルです。現在のローカル環境を実測した値ではありません。</p>
            </div>
            <div className="map-tools">
              <button className="capability-filter">すべての能力 <CaretDown /></button>
              <label className="search"><MagnifyingGlass /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="能力を検索…" /></label>
              <button className="filter-icon" aria-label="絞り込み"><Funnel /></button>
            </div>
          </div>

          <div className="lifecycle">
            {lifecycleStages.map(({ key, label, icon }) => <div className={`lifecycle-${key}`} key={key}>{icon}<span>{label}</span></div>)}
          </div>

          <div className="capability-grid">
            <div className="grid-header runtime-header">プラットフォーム</div>
            <div className="grid-header capability-header">能力<br /><small>Capability</small></div>
            {filtered.map((cap) => <div className="grid-header cap-head" key={cap.key}><cap.icon /><span>{cap.label}<small>{cap.sub}</small></span></div>)}
            {runtimes.map((runtime, ri) => (
              <div className="runtime-row" key={runtime.name}>
                <div className="runtime-name"><span className="runtime-mark">{runtime.mark}</span><strong>{runtime.name}</strong><small>ローカル接続 <i /></small></div>
                <div className="runtime-stage">利用面積</div>
                {filtered.map((cap) => (
                  <StateCell
                    key={cap.key}
                    state={runtime.states[cap.index]}
                    selected={selected.runtime === ri && selected.capability === cap.index}
                    label={`${runtime.name} ${cap.label}`}
                    onClick={() => setSelected({ runtime: ri, capability: cap.index })}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="legend">
            {Object.entries(stateMeta).map(([state, meta]) => <span key={state} className={`legend-${state}`}>{meta.symbol}{meta.label}</span>)}
            <span className="legend-unknown">{unknownEvidenceMeta.symbol}{unknownEvidenceMeta.label}</span>
          </div>

          <section className="recent">
            <div className="recent-head"><h2>最近の証拠と観察</h2><button>すべて表示</button></div>
            <div className="evidence-cards">
              <article><TestTube /><div><strong>pytest 発見</strong><EvidenceTag type="fact">事実</EvidenceTag><small>.venvで検出・版は未確認</small></div></article>
              <article><Check /><div><strong>コード検索 スモーク済み</strong><EvidenceTag type="fact">事実</EvidenceTag><small>rg --versionの出力を保存</small></div></article>
              <article><Clock /><div><strong>Git操作 観察中</strong><EvidenceTag type="inference">推論</EvidenceTag><small>ワイヤ未確認のため採用保留</small></div></article>
              <article><CircleDashed /><div><strong>パッケージ管理 未達成</strong><EvidenceTag type="unknown">不明</EvidenceTag><small>ネットワーク不要の確認が未実施</small></div></article>
            </div>
          </section>
        </section>

        <aside className="inspector">
          <div className="inspector-head">
            <div><h2>{runtimes[selected.runtime].name} × {selectedCapability.label}</h2><span className="status-chip">{statePresentation(runtimes[selected.runtime].states[selected.capability]).label}</span></div>
            <button aria-label="詳細を閉じる"><X /></button>
          </div>
          <div className="observed"><Clock />観測時刻: 2026-07-31 13:52（ローカル）<br /><ShieldCheck />スコープ: このマシンのみ</div>

          <section className="inspector-section fact-section">
            <h3>何が変わった <CaretDown /></h3>
            <p><EvidenceTag type="fact">事実</EvidenceTag> pytest実行ファイルをローカルで検出</p>
            <p><EvidenceTag type="fact">事実</EvidenceTag> tests/配下にテストファイルを検出</p>
            <p><EvidenceTag type="inference">推論</EvidenceTag> テスト能力を有効化できる可能性</p>
          </section>
          <section className="inspector-section reason-section">
            <h3>なぜ未採用か <CaretDown /></h3>
            <p><EvidenceTag type="fact">事実</EvidenceTag> {runtimes[selected.runtime].name}側の実行ワイヤは未確認</p>
            <p><EvidenceTag type="unknown">不明</EvidenceTag> 環境変数・権限の不足リスク</p>
          </section>
          <section className="inspector-section task-section">
            <h3>安全に試せる1タスク <CaretDown /></h3>
            <p><EvidenceTag type="inference">目的</EvidenceTag> ローカルで実行できる最小の証拠を収集</p>
            <p><EvidenceTag type="fact">実施</EvidenceTag> 対象1ファイルのみをdry-run</p>
            <p><EvidenceTag type="fact">証拠</EvidenceTag> 標準出力・終了コード・対象範囲</p>
          </section>
          <section className="inspector-section boundary-section">
            <h3>人の判断が必要な境界</h3>
            <div className="boundary-list">
              {["認証・APIキー", "Git push・PR作成", "設定・環境変数の変更", "公開・外部送信", "課金・有料アクション", "クラウド呼び出し"].map((item) => <span key={item}><X />{item}</span>)}
            </div>
          </section>
          <button className="primary-action" onClick={openExperiment}><Play weight="fill" />この1タスクを安全に試す</button>
          <small className="action-note">実行前に詳細プレビューを表示します</small>
          {experimentResult && (
            <div className="experiment-result" role="status">
              <Check weight="bold" />
              <div>
                <strong>ローカル実験を完了</strong>
                <small>終了コード 0・外部送信なし・設定変更なし</small>
              </div>
            </div>
          )}
        </aside>
      </main> : (
        <main className="catalog-workspace">
          <section className="catalog-header">
            <div>
              <h1>スキル・MCPカタログ</h1>
              <p>導入元、ジャンル、安全境界、検証状態を横断して確認します。</p>
              <p className="sample-notice">表示中のデータはMVP用サンプルです。現在のローカル環境を実測した値ではありません。</p>
            </div>
            <label className="catalog-search"><MagnifyingGlass /><input placeholder="スキル・MCP・ジャンルを検索…" /></label>
          </section>
          <div className="genre-tabs" aria-label="ジャンル">
            {["すべて", "コーディング", "ブラウザ・E2E", "デザイン", "セキュリティ", "自動化"].map((genre, index) => (
              <button className={index === 0 ? "active" : ""} key={genre}>{genre}</button>
            ))}
          </div>
          <section className="catalog-grid">
            {catalogItems.map((item) => (
              <article className="catalog-card" key={item.name}>
                <div className="catalog-card-top"><span className="catalog-icon"><Package /></span><span className="catalog-type">{item.type}</span></div>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <div className="catalog-meta"><span>{item.genre}</span><span>{item.status}</span><span>評価 {item.score}</span></div>
                {installReviewRequested.has(item.name) ? (
                  <button className="installed-button review-pending-button" aria-label={`${item.name}のレビュー待ち`} aria-disabled="true"><Clock />レビュー待ち</button>
                ) : item.status === "未導入" ? (
                  <button className="install-button" aria-label={`${item.name}をインストール`} onClick={(event) => openInstallReview(item, event)}>インストール</button>
                ) : (
                  <button className="installed-button" disabled><Check />{item.status}</button>
                )}
              </article>
            ))}
          </section>
          {installReviewName && (
            <div className="review-pending" role="status">
              <Clock />{installReviewName}をこの画面内のレビュー候補に追加しました。変更は実行していません。
            </div>
          )}
          <aside className="ranking-note">
            <ShieldCheck />
            <div><strong>ランキングは証拠ベース</strong><p>利用実績、スモーク成功、安全性、更新状態が測定されるまで点数を付けません。</p></div>
          </aside>
        </main>
      )}

      {experimentOpen && (
        <div className="modal-backdrop" onMouseDown={() => setExperimentOpen(false)}>
          <section className="experiment-modal" role="dialog" aria-modal="true" aria-label="安全実験のプレビュー" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title"><ShieldCheck /><div><h2>安全実験のプレビュー</h2><p>実行前に範囲と証拠を固定します。</p></div><button ref={modalCloseRef} aria-label="閉じる" onClick={() => setExperimentOpen(false)}><X /></button></div>
            <div className="experiment-flow">
              <div><b>1</b><span>入力</span><strong>tests/sample.test</strong></div>
              <div><b>2</b><span>実行</span><strong>読み取り専用dry-run</strong></div>
              <div><b>3</b><span>証拠</span><strong>出力・終了コード</strong></div>
            </div>
            <div className="safety-summary"><p><Check />ローカルファイルのみ</p><p><Check />一時出力のみ</p><p><X />外部送信なし</p><p><X />設定変更なし</p></div>
            <div className="modal-actions">
              <button onClick={() => setExperimentOpen(false)}>キャンセル</button>
              <button
                className="run-button"
                onClick={() => {
                  setExperimentOpen(false);
                  setExperimentResult({ exitCode: 0 });
                }}
              >
                ローカル実験を開始
              </button>
            </div>
          </section>
        </div>
      )}

      {installTarget && (
        <div className="modal-backdrop" onMouseDown={() => setInstallTarget(null)}>
          <section className="experiment-modal install-modal" role="dialog" aria-modal="true" aria-label="インストール前の確認" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title"><ShieldCheck /><div><h2>インストール前の確認</h2><p>{installTarget.name}</p></div><button ref={modalCloseRef} aria-label="閉じる" onClick={() => setInstallTarget(null)}><X /></button></div>
            <div className="install-review">
              <p><strong>変更先</strong><span>ローカル設定・パッケージ領域（実行前に確定）</span></p>
              <p><strong>ネットワーク</strong><span>パッケージ取得時に使用する可能性あり</span></p>
              <p><strong>戻し方</strong><span>追加ファイルと設定差分を記録して復元</span></p>
              <p><strong>現在の判定</strong><span className="review-required">人間レビューが必要</span></p>
            </div>
            <p className="install-safety-note">変更はまだ実行されません</p>
            <div className="modal-actions"><button onClick={() => setInstallTarget(null)}>キャンセル</button><button className="run-button" onClick={requestInstallReview}>レビュー候補に追加（この画面内のみ）</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
