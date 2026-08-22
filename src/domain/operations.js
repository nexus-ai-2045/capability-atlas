import { LIFECYCLE } from "./capability.js";

const TRACKED_FIELDS = ["version", "permissions", "route", "lifecycle"];
const DRIFT_EVENT_ORDER = [
  "collector_failed",
  "added",
  "removed",
  "version_changed",
  "permission_changed",
  "route_changed",
  "state_regressed",
  "evidence_stale",
];

const DEFAULT_STATE = {
  lifecycle: "discovered",
  evidenceStatus: "unknown",
  freshness: "stale",
  health: "unknown",
  drift: "none",
  route: "blocked_unknown",
};

const ALLOWED_OPERATIONS = new Set(["inventory_read", "local_read_smoke"]);
const HARD_CONSTRAINTS = [
  ["usesNetwork", "network_not_allowed"],
  ["requiresAuth", "auth_not_allowed"],
  ["mutatesSettings", "settings_not_allowed"],
  ["writesFiles", "writes_not_allowed"],
  ["sendsExternally", "external_send_not_allowed"],
  ["paidAction", "paid_action_not_allowed"],
];
const ABSOLUTE_MAX_INPUT_BYTES = 1024 * 1024;
const ABSOLUTE_MAX_DURATION_MS = 30_000;

function capabilitiesOf(snapshot) {
  return Array.isArray(snapshot?.capabilities) ? snapshot.capabilities : [];
}

function byId(capabilities) {
  return new Map(
    capabilities
      .filter((capability) => typeof capability?.id === "string" && capability.id.length > 0)
      .map((capability) => [capability.id, capability]),
  );
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function equalValue(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function cloneValue(value) {
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
}

export function diffSnapshots(previous = {}, current = {}) {
  const previousById = byId(capabilitiesOf(previous));
  const currentById = byId(capabilitiesOf(current));
  const allIds = [...new Set([...previousById.keys(), ...currentById.keys()])].sort();
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const id of allIds) {
    const before = previousById.get(id);
    const after = currentById.get(id);
    if (!before) {
      added.push(id);
      continue;
    }
    if (!after) {
      removed.push(id);
      continue;
    }

    const changes = TRACKED_FIELDS
      .filter((field) => !equalValue(before[field], after[field]))
      .map((field) => ({
        field,
        from: cloneValue(before[field]),
        to: cloneValue(after[field]),
      }));

    if (changes.length > 0) changed.push({ id, changes });
    else unchanged.push(id);
  }

  return { added, removed, changed, unchanged };
}

function lifecycleRank(value) {
  return LIFECYCLE.indexOf(value);
}

function eventForChange(id, change) {
  if (change.field === "version") {
    return { type: "version_changed", capabilityId: id, from: change.from, to: change.to };
  }
  if (change.field === "permissions") {
    return { type: "permission_changed", capabilityId: id, from: change.from, to: change.to };
  }
  if (change.field === "route") {
    return { type: "route_changed", capabilityId: id, from: change.from, to: change.to };
  }
  if (change.field === "lifecycle" && lifecycleRank(change.to) < lifecycleRank(change.from)) {
    return { type: "state_regressed", capabilityId: id, from: change.from, to: change.to };
  }
  return null;
}

export function detectDrift(previous = {}, current = {}) {
  const diff = diffSnapshots(previous, current);
  const events = [];
  if (current?.collectorStatus === "failed") events.push({ type: "collector_failed", capabilityId: "*" });

  for (const id of diff.added) events.push({ type: "added", capabilityId: id });
  for (const id of diff.removed) events.push({ type: "removed", capabilityId: id });
  for (const { id, changes } of diff.changed) {
    for (const change of changes) {
      const event = eventForChange(id, change);
      if (event) events.push(event);
    }
  }

  for (const capability of capabilitiesOf(current).sort((left, right) => left.id.localeCompare(right.id))) {
    if (capability.freshness === "stale") {
      events.push({ type: "evidence_stale", capabilityId: capability.id });
    }
  }

  return events.sort((left, right) => {
    const typeOrder = DRIFT_EVENT_ORDER.indexOf(left.type) - DRIFT_EVENT_ORDER.indexOf(right.type);
    if (typeOrder !== 0) return typeOrder;
    return left.capabilityId.localeCompare(right.capabilityId);
  });
}

export function createOperationalState(input = {}) {
  const allowed = {
    lifecycle: new Set(LIFECYCLE),
    evidenceStatus: new Set(["fact", "inference", "unknown"]),
    freshness: new Set(["fresh", "stale"]),
    health: new Set(["healthy", "degraded", "unknown"]),
    drift: new Set(["none", "added", "removed", "changed", "regressed"]),
    route: new Set(["safe_local", "human_review", "blocked_unknown"]),
  };

  return Object.fromEntries(
    Object.entries(DEFAULT_STATE).map(([key, fallback]) => [
      key,
      allowed[key].has(input[key]) ? input[key] : fallback,
    ]),
  );
}

function rejectReason(action, constraints) {
  if (!action || typeof action !== "object") return "action_invalid";
  if (!ALLOWED_OPERATIONS.has(action.operation)) return "operation_not_allowed";
  if (typeof action.target !== "string" || action.target.length === 0) return "target_required";
  if (typeof action.scope !== "string" || action.scope.length === 0) return "scope_required";

  for (const [field, reason] of HARD_CONSTRAINTS) {
    if (action[field] === true) return reason;
    if (action[field] !== undefined && typeof action[field] !== "boolean") {
      return `${reason.replace("_not_allowed", "")}_unknown`;
    }
  }

  const inputLimit = Math.min(
    ABSOLUTE_MAX_INPUT_BYTES,
    Number.isFinite(constraints.maxInputBytes) ? Math.max(0, constraints.maxInputBytes) : ABSOLUTE_MAX_INPUT_BYTES,
  );
  if (action.inputBytes !== undefined && (!Number.isFinite(action.inputBytes) || action.inputBytes > inputLimit)) {
    return "input_bound_exceeded";
  }

  const durationLimit = Math.min(
    ABSOLUTE_MAX_DURATION_MS,
    Number.isFinite(constraints.maxDurationMs) ? Math.max(0, constraints.maxDurationMs) : ABSOLUTE_MAX_DURATION_MS,
  );
  if (action.durationMs !== undefined && (!Number.isFinite(action.durationMs) || action.durationMs > durationLimit)) {
    return "duration_bound_exceeded";
  }

  return null;
}

function diversityKey(action) {
  return action.diversityKey ?? action.runtime ?? action.genre ?? action.id;
}

export function planNextActions({ candidates = [], constraints = {}, maxCandidates = 3 } = {}) {
  const limit = Math.min(3, Math.max(0, Number.isInteger(maxCandidates) ? maxCandidates : 0));
  const accepted = [];
  const rejected = [];

  for (const action of candidates) {
    const reason = rejectReason(action, constraints);
    if (reason) rejected.push({ id: action?.id ?? "*", reason });
    else accepted.push(action);
  }

  rejected.sort((left, right) => left.id.localeCompare(right.id));
  accepted.sort((left, right) => {
    const priority = (Number.isFinite(right.priority) ? right.priority : 0) - (Number.isFinite(left.priority) ? left.priority : 0);
    if (priority !== 0) return priority;
    return String(left.id).localeCompare(String(right.id));
  });

  const actions = [];
  const selectedDiversity = new Set();
  for (const action of accepted) {
    if (actions.length >= limit) break;
    const key = diversityKey(action);
    if (selectedDiversity.has(key)) continue;
    selectedDiversity.add(key);
    actions.push(action);
  }
  for (const action of accepted) {
    if (actions.length >= limit) break;
    if (!actions.includes(action)) actions.push(action);
  }

  if (actions.length === 0) {
    return { route: "blocked_unknown", actions: [], rejected, reason: "no_safe_candidates" };
  }
  return { route: "safe_local", actions, rejected, reason: "bounded_plan_ready" };
}
