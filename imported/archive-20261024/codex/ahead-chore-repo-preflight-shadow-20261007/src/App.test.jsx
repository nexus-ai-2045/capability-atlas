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
    expect(screen.getByText("何が変わった")).toBeVisible();
    expect(screen.getByText("人の判断が必要な境界")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "この1タスクを安全に試す" }));

    const dialog = screen.getByRole("dialog", { name: "安全実験のプレビュー" });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText("外部送信なし")).toBeVisible();
    expect(screen.getByRole("button", { name: "ローカル実験を開始" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "ローカル実験を開始" }));

    expect(screen.queryByRole("dialog", { name: "安全実験のプレビュー" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("ローカル実験を完了");
    expect(screen.getByRole("status")).toHaveTextContent("外部送信なし");
  });

  it("opens the skill and MCP catalog and stops at an install review", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "スキル・MCPカタログ" }));

    expect(screen.getByRole("heading", { name: "スキル・MCPカタログ" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Playwright MCPをインストール" }));

    const dialog = screen.getByRole("dialog", { name: "インストール前の確認" });
    expect(within(dialog).getByText("変更先")).toBeVisible();
    expect(within(dialog).getByText("人間レビューが必要")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "確認して進む" })).toBeEnabled();
  });
});
