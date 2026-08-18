export const LIFECYCLE = [
  "discovered",
  "installed",
  "wired",
  "enabled",
  "loaded",
  "smoke_tested",
  "adopted",
  "observed",
];

const evidenceKey = {
  discovered: "discovered",
  installed: "installed",
  wired: "wired",
  enabled: "enabled",
  loaded: "loaded",
  smoke_tested: "smokeTested",
  adopted: "adopted",
  observed: "observed",
};

const guardedOperations = new Set([
  "auth",
  "settings",
  "push",
  "pull_request",
  "publish",
  "external_send",
  "paid_action",
]);

export function nextLifecycleState(current, evidence = {}) {
  const index = LIFECYCLE.indexOf(current);
  if (index < 0 || index === LIFECYCLE.length - 1) return current;
  const candidate = LIFECYCLE[index + 1];
  return evidence[evidenceKey[candidate]] ? candidate : current;
}

export function routeOperation(operation) {
  if (operation === "local_read_smoke") {
    return { route: "safe_local", automatic: true };
  }
  if (guardedOperations.has(operation)) {
    return { route: "human_review", automatic: false };
  }
  return { route: "blocked_unknown", automatic: false };
}
