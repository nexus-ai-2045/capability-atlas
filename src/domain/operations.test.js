import { describe, expect, it } from "vitest";
import {
  createOperationalState,
  detectDrift,
  diffSnapshots,
  planNextActions,
} from "./operations.js";

const capability = (overrides = {}) => ({
  id: "codex.search",
  version: "1.0.0",
  permissions: [],
  route: "safe_local",
  lifecycle: "smoke_tested",
  ...overrides,
});

describe("snapshot diff and drift", () => {
  it("returns deterministic added, removed, changed, and unchanged capabilities", () => {
    const previous = { capabilities: [capability(), capability({ id: "claude.code" })] };
    const current = {
      capabilities: [
        capability({ version: "1.1.0" }),
        capability({ id: "gemini.research" }),
      ],
    };

    expect(diffSnapshots(previous, current)).toEqual({
      added: ["gemini.research"],
      removed: ["claude.code"],
      changed: [
        {
          id: "codex.search",
          changes: [{ field: "version", from: "1.0.0", to: "1.1.0" }],
        },
      ],
      unchanged: [],
    });
  });

  it("detects configuration drift, lifecycle regression, stale evidence, and collector failure", () => {
    const previous = {
      capabilities: [capability({ permissions: ["read"], lifecycle: "adopted" })],
    };
    const current = {
      observedAt: "2026-08-22T00:00:00.000Z",
      collectorStatus: "failed",
      capabilities: [
        capability({
          permissions: ["read", "write"],
          lifecycle: "installed",
          freshness: "stale",
        }),
      ],
    };

    expect(detectDrift(previous, current)).toEqual([
      { type: "collector_failed", capabilityId: "*" },
      {
        type: "permission_changed",
        capabilityId: "codex.search",
        from: ["read"],
        to: ["read", "write"],
      },
      {
        type: "state_regressed",
        capabilityId: "codex.search",
        from: "adopted",
        to: "installed",
      },
      { type: "evidence_stale", capabilityId: "codex.search" },
    ]);
  });
});

describe("orthogonal operational state", () => {
  it("keeps lifecycle, evidence, freshness, health, drift, and route independent", () => {
    expect(createOperationalState({ lifecycle: "smoke_tested", drift: "changed" })).toEqual({
      lifecycle: "smoke_tested",
      evidenceStatus: "unknown",
      freshness: "stale",
      health: "unknown",
      drift: "changed",
      route: "blocked_unknown",
    });
  });
});

describe("bounded planner", () => {
  it("returns at most three safe, diverse candidates in deterministic order", () => {
    const candidates = [
      { id: "b", runtime: "claude", genre: "code", operation: "local_read_smoke", target: "b", scope: "local", priority: 9 },
      { id: "a", runtime: "codex", genre: "code", operation: "local_read_smoke", target: "a", scope: "local", priority: 9 },
      { id: "c", runtime: "gemini", genre: "research", operation: "local_read_smoke", target: "c", scope: "local", priority: 8 },
      { id: "d", runtime: "grok", genre: "research", operation: "local_read_smoke", target: "d", scope: "local", priority: 7 },
    ];

    const result = planNextActions({ candidates, maxCandidates: 99 });

    expect(result.route).toBe("safe_local");
    expect(result.actions.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(result.actions).toHaveLength(3);
    expect(result.humanReview).toEqual([]);
  });

  it("fails closed when an action is unknown or has any hard-constraint violation", () => {
    const result = planNextActions({
      candidates: [
        { id: "unknown", operation: "run_shell", target: "x", scope: "local" },
        { id: "network", operation: "local_read_smoke", target: "y", scope: "local", usesNetwork: true },
      ],
    });

    expect(result).toEqual({
      route: "blocked_unknown",
      actions: [],
      humanReview: [],
      rejected: [
        { id: "network", reason: "network_not_allowed" },
        { id: "unknown", reason: "operation_not_allowed" },
      ],
      reason: "no_safe_candidates",
    });
  });

  it("keeps guarded operations as explicit human-review material", () => {
    const result = planNextActions({ candidates: [
      { id: "safe", operation: "local_read_smoke", target: "safe", scope: "local" },
      { id: "auth", operation: "auth", target: "account", scope: "external" },
    ] });
    expect(result.route).toBe("safe_local");
    expect(result.actions.map(({ id }) => id)).toEqual(["safe"]);
    expect(result.humanReview.map(({ id }) => id)).toEqual(["auth"]);
  });

  it("uses the shared safety router as the safe-operation source of truth", () => {
    expect(planNextActions({ candidates: [
      { id: "inventory", operation: "inventory_read", target: "local", scope: "local" },
    ] })).toEqual({
      route: "blocked_unknown",
      actions: [],
      humanReview: [],
      rejected: [{ id: "inventory", reason: "operation_not_allowed" }],
      reason: "no_safe_candidates",
    });
  });
});
