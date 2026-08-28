import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("ai-ratchet-gate baseline exists and does not invent engine logic", () => {
  const baseline = read(".ai-ratchet-gate/baseline.txt");
  assert.match(baseline, /ai-ratchet-gate/);
  assert.match(baseline, /grandfather|既存|baseline/i);
  assert.equal(existsSync(path.join(root, "ai_ratchet_gate.py")), false);
  assert.equal(existsSync(path.join(root, "src/ai_ratchet_gate")), false);
});

test("requirements-tools pins Release wheel with sha256 (no PyPI bare name)", () => {
  const req = read("requirements-tools.txt");
  assert.match(req, /ai-ratchet-gate @ https:\/\/github\.com\/nexus-ai-2045\/ai-ratchet-gate\/releases\/download\/v0\.1\.1\//);
  assert.match(req, /--hash=sha256:b3f22ab772699d57906326e42189e0ab7a0ee9e33dcad55a90909ece35106cd7/);
  assert.doesNotMatch(req, /^ai-ratchet-gate\s*$/m);
});

test("repo-preflight wrapper points upstream and fail-closes empty base", () => {
  const wrapper = read("tools/run_repo_preflight.py");
  assert.match(wrapper, /nexus-ai-2045\/repo-preflight/);
  assert.match(wrapper, /readiness_scan\.py/);
  assert.match(wrapper, /consistency_gate\.py/);
  assert.match(wrapper, /without copying its inspection logic|検査ロジックはコピーしない|Do not copy/i);
  assert.match(wrapper, /empty consistency base: fail-closed/);
  assert.match(wrapper, /--require-config/);
  assert.match(wrapper, /--require-mode/);
  assert.equal(existsSync(path.join(root, "scripts/readiness_scan.py")), false);
  assert.equal(existsSync(path.join(root, "scripts/consistency_gate.py")), false);
});

test("consistency config is shadow consumer contract", () => {
  const config = JSON.parse(read(".repo-preflight-consistency.json"));
  assert.equal(config.schema, "repo-preflight.consistency/v1");
  assert.equal(config.mode, "shadow");
  assert.ok(config.readme_contracts.required_paths.includes("tools/run_repo_preflight.py"));
  assert.ok(config.readme_contracts.required_paths.includes(".ai-ratchet-gate/baseline.txt"));
});

test("upstream-style gate workflows connect without embedding engineering-brain", () => {
  const productCi = read(".github/workflows/ci.yml");
  const ratchet = read(".github/workflows/ai-ratchet-gate.yml");
  const consistency = read(".github/workflows/repo-preflight-consistency.yml");

  assert.match(productCi, /npm run verify/);
  assert.doesNotMatch(productCi, /engineering-brain|engineering_brain/);
  assert.doesNotMatch(productCi, /ai-ratchet-gate|repo-preflight/);

  assert.match(ratchet, /AI_RATCHET_GATE_WHEEL_SHA256: b3f22ab772699d57906326e42189e0ab7a0ee9e33dcad55a90909ece35106cd7/);
  assert.match(ratchet, /python -m ai_ratchet_gate --repo \./);
  assert.doesNotMatch(ratchet, /engineering-brain|engineering_brain/);

  assert.match(consistency, /nexus-ai-2045\/repo-preflight/);
  assert.match(consistency, /consistency_gate\.py/);
  assert.match(consistency, /\.repo-preflight-consistency\.json/);
  assert.match(consistency, /empty consistency base: fail-closed/);
  assert.match(consistency, /--require-mode shadow/);
  assert.doesNotMatch(consistency, /engineering-brain|engineering_brain/);
  assert.doesNotMatch(consistency, /auto-merge|visibility:\s*public/i);
});

test("canonical dependency pointers exist and forbid second OS/SSOT", () => {
  const deps = read("docs/DEPENDENCIES.md");
  assert.match(deps, /fractal-decision-ecosystem/);
  assert.match(deps, /repo-preflight/);
  assert.match(deps, /ai-ratchet-gate/);
  assert.match(deps, /engineering-brain/);
  assert.match(deps, /第二フレームワークを発明しない|第二SSOTをこの repo に作らない/);
  assert.equal(existsSync(path.join(root, "fde_workflow.yaml")), false);
  assert.equal(existsSync(path.join(root, "operating-card.md")), false);
});

test("required readiness documents exist without inventing PUBLIC_READY", () => {
  for (const file of ["README.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "PREFLIGHT.md"]) {
    assert.equal(existsSync(path.join(root, file)), true, `${file} must exist`);
  }
  assert.equal(existsSync(path.join(root, "PUBLIC_READY.md")), false);
});
