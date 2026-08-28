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

test("repo-preflight wrapper points upstream and does not embed scanner", () => {
  const wrapper = read("tools/run_repo_preflight.py");
  assert.match(wrapper, /nexus-ai-2045\/repo-preflight/);
  assert.match(wrapper, /readiness_scan\.py/);
  assert.match(wrapper, /consistency_gate\.py/);
  assert.match(wrapper, /without copying its inspection logic|検査ロジックはコピーしない|Do not copy/i);
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

test("CI wires ratchet and preflight without merge approval claims", () => {
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /ai_ratchet_gate|ai-ratchet-gate/);
  assert.match(ci, /run_repo_preflight\.py|repo-preflight/);
  assert.match(ci, /b3f22ab772699d57906326e42189e0ab7a0ee9e33dcad55a90909ece35106cd7/);
  assert.doesNotMatch(ci, /auto-merge|visibility:\s*public/i);
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

test("required readiness documents exist", () => {
  for (const file of ["README.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "PREFLIGHT.md"]) {
    assert.equal(existsSync(path.join(root, file)), true, missing(file));
  }
});

function missing(file) {
  return `${file} must exist`;
}
