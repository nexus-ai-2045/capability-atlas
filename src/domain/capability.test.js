import { describe, expect, it } from "vitest";
import {
  LIFECYCLE,
  nextLifecycleState,
  routeOperation,
} from "./capability.js";

describe("capability lifecycle", () => {
  it("moves only to the next evidence-backed state", () => {
    expect(nextLifecycleState("installed", { wired: true })).toBe("wired");
    expect(nextLifecycleState("installed", { smokeTested: true })).toBe("installed");
    expect(LIFECYCLE.at(-1)).toBe("observed");
  });
});

describe("operation routing", () => {
  it.each(["auth", "settings", "push", "pull_request", "publish", "external_send", "paid_action"])(
    "routes %s to human review",
    (operation) => {
      expect(routeOperation(operation)).toEqual({
        route: "human_review",
        automatic: false,
      });
    },
  );

  it("allows a bounded local read-only smoke", () => {
    expect(routeOperation("local_read_smoke")).toEqual({
      route: "safe_local",
      automatic: true,
    });
  });
});
