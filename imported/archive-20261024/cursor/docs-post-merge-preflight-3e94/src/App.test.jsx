import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.jsx";

afterEach(cleanup);

describe("Capability Atlas", () => {
  it("shows the map, evidence inspector, and safe experiment flow", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "能力マップ（ライフサイクル別）" })).toBeVisible();
    expect(screen.getByText("サンプル・未実測")).toBeVisible();
    for (const label of [
      "発見",
      "インストール済み",
      "ワイヤ済み",
      "有効化",
      "読み込み済み",
      "スモーク済み",
      "採用",
      "観察中",
    ]) {
      expect(screen.getAllByText(label, { exact: true }).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("未確認（証拠なし）")).toBeVisible();
    expect(screen.getByText("何が変わった")).toBeVisible();
    expect(screen.getByText("人の判断が必要な境界")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "この1タスクを安全に試す" }));

    const dialog = screen.getByRole("dialog", { name: "安全実験のプレビュー" });
    expect(dialog).toBeVisible();
    expect(screen.getByRole("button", { name: "閉じる" })).toHaveFocus();
    expect(within(dialog).getByText("外部送信なし")).toBeVisible();
    expect(screen.getByRole("button", { name: "ローカル実験を開始" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "ローカル実験を開始" }));

    expect(screen.queryByRole("dialog", { name: "安全実験のプレビュー" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "この1タスクを安全に試す" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("ローカル実験を完了");
    expect(screen.getByRole("status")).toHaveTextContent("外部送信なし");
  });

  it("closes the safe experiment preview with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: "この1タスクを安全に試す" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "安全実験のプレビュー" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("restores focus after closing the safe experiment preview with its close button", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: "この1タスクを安全に試す" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog", { name: "安全実験のプレビュー" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens the skill and MCP catalog and stops at an install review", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "スキル・MCPカタログ" }));

    expect(screen.getByRole("heading", { name: "スキル・MCPカタログ" })).toBeVisible();
    const installTrigger = screen.getByRole("button", { name: "Playwright MCPをインストール" });
    await user.click(installTrigger);

    const dialog = screen.getByRole("dialog", { name: "インストール前の確認" });
    expect(within(dialog).getByText("変更先")).toBeVisible();
    expect(within(dialog).getByText("人間レビューが必要")).toBeVisible();
    expect(within(dialog).getByText("変更はまだ実行されません")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "レビュー候補に追加（この画面内のみ）" })).toBeEnabled();

    await user.click(within(dialog).getByRole("button", { name: "レビュー候補に追加（この画面内のみ）" }));

    expect(screen.queryByRole("dialog", { name: "インストール前の確認" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("この画面内のレビュー候補に追加しました");
    const pendingTrigger = screen.getByRole("button", { name: "Playwright MCPのレビュー待ち" });
    expect(pendingTrigger).toHaveAttribute("aria-disabled", "true");
    expect(pendingTrigger).toHaveFocus();
  });

  it("restores focus after closing the install preview with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "スキル・MCPカタログ" }));
    const trigger = screen.getByRole("button", { name: "Playwright MCPをインストール" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "インストール前の確認" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("restores focus after closing the install preview with its close button", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "スキル・MCPカタログ" }));
    const trigger = screen.getByRole("button", { name: "Playwright MCPをインストール" });
    await user.click(trigger);
    await user.click(within(screen.getByRole("dialog", { name: "インストール前の確認" })).getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog", { name: "インストール前の確認" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
