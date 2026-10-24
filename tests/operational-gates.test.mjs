import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

test("requirements-tools vendors nothing and only accepts hash-pinned remote artifacts", () => {
  const req = read("requirements-tools.txt");
  // 配布物をrepoへ同梱しない。
  assert.equal(existsSync(path.join(root, "vendor")), false);
  assert.doesNotMatch(req, /vendor\/|^\.\//m);
  // ai-ratchet-gate は公開取得元が出るまで「0.2.0 のリリース待ち」と明示する。
  assert.match(req, /ai-ratchet-gate 0\.2\.0 のリリース待ち/);
  // 実際の要求行（継続行を結合）は全て https 取得 + sha256 固定であること。
  const logical = req.replace(/\\\n/g, " ").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (const line of logical) {
    assert.match(line, /^https:\/\/\S+ /, line);
    assert.match(line, /--hash=sha256:[0-9a-f]{64}/, line);
  }
  assert.doesNotMatch(req, /^ai-ratchet-gate\s*$/m);
});

test("repo-preflight wrapper pins upstream SHA and fail-closes empty base", () => {
  const wrapper = read("tools/run_repo_preflight.py");
  assert.match(wrapper, /nexus-ai-2045\/repo-preflight/);
  assert.match(wrapper, /REPO_PREFLIGHT_SHA = "5b7c774deb8e9abcf0fce0c5f39ec1c1f3a894f3"/);
  assert.match(wrapper, /REPO_PREFLIGHT_TAG = "v0\.10\.0"/);
  assert.match(wrapper, /REPO_PREFLIGHT_URL = "https:\/\/github\.com\/nexus-ai-2045\/repo-preflight\.git"/);
  assert.match(wrapper, /readiness_scan\.py/);
  assert.match(wrapper, /consistency_gate\.py/);
  assert.match(wrapper, /without copying its inspection logic|検査ロジックはコピーしない|Do not copy/i);
  assert.match(wrapper, /empty consistency base: fail-closed/);
  // 実行時取得：正確なcommitだけをfetchし、取得後のcommit idとrelease tagの指す先を照合する。
  assert.doesNotMatch(wrapper, /git clone|"clone"|\.extractall\(/);
  assert.match(wrapper, /"fetch", "-q", "--depth", "1", "--no-tags", REPO_PREFLIGHT_URL, REPO_PREFLIGHT_SHA/);
  assert.match(wrapper, /fetched commit does not match pinned SHA/);
  assert.match(wrapper, /does not peel to pinned SHA/);
  assert.match(wrapper, /SOURCE_ARCHIVE: Path \| None = None/);
  assert.equal(existsSync(path.join(root, "vendor")), false);
  assert.match(wrapper, /--prepare-only/);
  assert.match(wrapper, /--require-config/);
  assert.match(wrapper, /--require-mode/);
  assert.equal(existsSync(path.join(root, "scripts/readiness_scan.py")), false);
  assert.equal(existsSync(path.join(root, "scripts/consistency_gate.py")), false);
});

test("consistency config is shadow consumer contract", () => {
  const config = JSON.parse(read(".repo-preflight-consistency.json"));
  assert.equal(config.schema, "repo-preflight.consistency/v1");
  assert.equal(config.mode, "shadow");
  assert.match(
    config.$schema,
    /repo-preflight\/5b7c774deb8e9abcf0fce0c5f39ec1c1f3a894f3\/schemas\/repository-consistency\.schema\.json/,
  );
  assert.ok(config.readme_contracts.required_paths.includes("tools/run_repo_preflight.py"));
  assert.ok(config.readme_contracts.required_paths.includes(".ai-ratchet-gate/baseline.txt"));
});

test("repository-guarantees workflow is dispatch-only without embedding engineering-brain", () => {
  const productCi = read(".github/workflows/ci.yml");
  const guarantees = read(".github/workflows/repository-guarantees.yml");

  assert.match(productCi, /npm run verify/);
  assert.doesNotMatch(productCi, /engineering-brain|engineering_brain/);
  assert.doesNotMatch(productCi, /ai-ratchet-gate|repo-preflight/);

  assert.match(guarantees, /on:\s*\n\s*workflow_dispatch:\s*$/m);
  assert.doesNotMatch(guarantees, /^\s*pull_request:\s*$/m);
  assert.doesNotMatch(guarantees, /^\s*push:\s*$/m);
  assert.match(guarantees, /REPO_PREFLIGHT_SHA: 5b7c774deb8e9abcf0fce0c5f39ec1c1f3a894f3/);
  assert.match(guarantees, /空diff fail-closed|BASE==HEAD/);
  assert.match(guarantees, /python -m ai_ratchet_gate --repo \./);
  assert.match(guarantees, /consistency_gate\.py/);
  assert.match(guarantees, /--require-mode shadow/);
  assert.match(guarantees, /requirements-tools\.txt/);
  assert.match(guarantees, /tools\/run_repo_preflight\.py --cache.*--prepare-only/);
  assert.doesNotMatch(guarantees, /git clone|git.*repo-preflight.*checkout/);
  // コメントで「埋め込まない」と宣言するのは可。実行ステップに埋め込まないこと。
  assert.match(guarantees, /engineering-brain は埋め込まない/);
  assert.doesNotMatch(guarantees, /uses:.*engineering-brain|pip install.*engineering[_-]brain/i);
  assert.doesNotMatch(guarantees, /auto-merge|visibility:\s*public/i);

  assert.equal(existsSync(path.join(root, ".github/workflows/ai-ratchet-gate.yml")), false);
  assert.equal(existsSync(path.join(root, ".github/workflows/repo-preflight-consistency.yml")), false);
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

test("pinned source executes both scanners and rejects tamper, unsafe members, and stale caches", () => {
  const script = String.raw`
import contextlib, hashlib, importlib.util, io, json, pathlib, tarfile, tempfile
spec = importlib.util.spec_from_file_location("atlas_preflight", "tools/run_repo_preflight.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    archive = root / "fixture.tar.gz"
    def make_archive(extra=None, readiness_status="pass"):
        with tarfile.open(archive, "w:gz") as tf:
            scripts = {
                "scripts/readiness_scan.py": 'import json,sys; assert "--release" in sys.argv; assert "--consistency-base-ref" in sys.argv; print(json.dumps({"schema":"repo-preflight.scan/v3", "status":"pass", "fixture":"readiness-executed"}))',
                "scripts/consistency_gate.py": 'import json,sys; assert "--require-config" in sys.argv; assert sys.argv[sys.argv.index("--require-mode")+1]=="shadow"; print(json.dumps({"status":"pass", "mode":"shadow", "fixture":"consistency-executed"}))',
            }
            scripts["scripts/readiness_scan.py"] = scripts["scripts/readiness_scan.py"].replace('"status":"pass"', '"status":"' + readiness_status + '"')
            for name, source in scripts.items():
                data = source.encode()
                member = tarfile.TarInfo("repo-preflight/" + name)
                member.size = len(data)
                tf.addfile(member, io.BytesIO(data))
            if extra is not None:
                tf.addfile(extra)
        m.SOURCE_ARCHIVE = archive
        m.REPO_PREFLIGHT_ARCHIVE_SHA256 = hashlib.sha256(archive.read_bytes()).hexdigest()
    def rejected(action, fragment):
        try:
            action()
        except ValueError as exc:
            assert fragment in str(exc), str(exc)
        else:
            raise AssertionError("expected rejection: " + fragment)
    make_archive()
    cache = root / "normal-cache"
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        assert m.main(["--repo", str(root), "--cache", str(cache), "--base-ref", "review-base"]) == 0
    assert "readiness-executed" in output.getvalue()
    assert "consistency-executed" in output.getvalue()
    m.ensure_checkout(cache)  # identical cache reuse succeeds without mutation
    sentinel = cache / "keep.txt"
    sentinel.write_text("preserve existing cache")
    rejected(lambda: m.ensure_checkout(cache), "stale source cache")
    assert sentinel.read_text() == "preserve existing cache"
    raw = archive.read_bytes()
    archive.write_bytes(raw[:-1] + bytes([raw[-1] ^ 1]))
    tampered_cache = root / "tampered-cache"
    rejected(lambda: m.ensure_checkout(tampered_cache), "SHA-256 mismatch")
    assert not tampered_cache.exists()
    for name, kind in [("repo-preflight/../../escape", tarfile.REGTYPE), ("/escape", tarfile.REGTYPE), ("repo-preflight/link", tarfile.SYMTYPE), ("repo-preflight/hard", tarfile.LNKTYPE)]:
        bad = tarfile.TarInfo(name)
        bad.type = kind
        bad.linkname = "../../escape"
        make_archive(bad)
        rejected(lambda: m.ensure_checkout(root / "unsafe-cache"), "unsafe archive member")
        assert not (root / "unsafe-cache").exists()
        assert not (root.parent / "escape").exists()
    make_archive()
    make_archive(readiness_status="tool_error")
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        assert m.main(["--repo", str(root), "--cache", str(root / "tool-error-cache"), "--base-ref", "review-base"]) == 1
    make_archive()
    link = root / "link-cache"
    link.symlink_to(cache, target_is_directory=True)
    rejected(lambda: m.ensure_checkout(link), "must not be a symlink")
    stderr = io.StringIO()
    with contextlib.redirect_stderr(stderr):
        assert m.main(["--repo", str(root), "--cache", str(root / "empty-base"), "--base-ref", ""]) == 1
    assert not (root / "empty-base").exists()
print(json.dumps({"normal_scanners": 2, "identical_cache_reuse": True, "archive_tamper_rejected": True, "unsafe_members_rejected": 4, "stale_cache_preserved": True, "symlink_cache_rejected": True, "empty_base_rejected": True, "readiness_tool_error_rejected": True}))
`;
  const result = spawnSync("python3", ["-B", "-c", script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"normal_scanners": 2/);
  assert.match(result.stdout, /"unsafe_members_rejected": 4/);
});

test("runtime fetch rejects a pin that the release tag does not point to", () => {
  const script = String.raw`
import importlib.util, json, pathlib, tempfile
spec = importlib.util.spec_from_file_location("atlas_preflight", "tools/run_repo_preflight.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
m.REPO_PREFLIGHT_SHA = "0" * 40
with tempfile.TemporaryDirectory() as directory:
    cache = pathlib.Path(directory) / "cache"
    try:
        m.ensure_checkout(cache)
    except ValueError as exc:
        assert "does not peel to pinned SHA" in str(exc), str(exc)
    else:
        raise AssertionError("expected pin mismatch rejection")
    assert not cache.exists()
print(json.dumps({"pin_mismatch_rejected": True}))
`;
  const result = spawnSync("python3", ["-B", "-c", script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"pin_mismatch_rejected": true/);
});

test("canonical push dialogue validates its embedded scan and preserves human questions", () => {
  const script = String.raw`
import contextlib, copy, hashlib, importlib.util, io, json, os, pathlib, subprocess, tarfile, tempfile
spec = importlib.util.spec_from_file_location("atlas_preflight", "tools/run_repo_preflight.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
for key in list(os.environ):
    if key.startswith("GIT_"):
        del os.environ[key]
with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    canonical = root / "canonical"
    m.ensure_checkout(canonical)
    gate_spec = importlib.util.spec_from_file_location("canonical_dialogue", canonical / "scripts/dialogue_gate.py")
    gate = importlib.util.module_from_spec(gate_spec)
    gate_spec.loader.exec_module(gate)
    policy = root / "synthetic-policy.txt"
    policy.write_text("synthetic-private-identity-marker\n")
    os.environ.pop("PREFLIGHT_PRIVATE_PATTERNS_FILE", None)
    os.environ.pop("PUBLIC_IDENTITY_GUARD_SCRIPT", None)
    os.environ["PREFLIGHT_PRIVATE_PATTERNS"] = json.dumps({"allow_email_patterns":[r"[^@]+@example\.invalid"],"deny_patterns":["synthetic-private-identity-marker"]})
    os.environ["PUBLIC_IDENTITY_DENYLIST"] = str(policy)
    repo = root / "repo"
    repo.mkdir()
    def git(*args):
        return subprocess.run(["git", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", *args], cwd=repo, check=True, text=True, capture_output=True)
    git("init", "--initial-branch=main")
    git("config", "user.name", "Fixture Author")
    git("config", "user.email", "fixture@example.invalid")
    (repo / "README.md").write_text("# Fixture repository\n")
    (repo / ".repo-preflight-consistency.json").write_text(json.dumps({"schema":"repo-preflight.consistency/v1", "mode":"shadow"}))
    git("add", ".")
    git("commit", "-m", "initial fixture")
    git("remote", "add", "origin", "https://github.com/example/fixture.git")
    git("update-ref", "refs/remotes/origin/main", "HEAD")
    (repo / "target.txt").write_text("safe target content\n")
    git("add", "target.txt")
    git("commit", "-m", "target fixture")
    stdout = io.StringIO()
    stderr = io.StringIO()
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        actual_rc = m.main(["--repo", str(repo), "--cache", str(canonical), "--base-ref", "origin/main", "--intent", "push"])
    actual = json.JSONDecoder().raw_decode(stdout.getvalue().split("==> repo-preflight readiness_scan", 1)[1].lstrip())[0]
    assert actual["schema"] == "repo-preflight.dialogue/v3", stderr.getvalue()
    assert actual["scan"]["schema"] == "repo-preflight.scan/v3"
    assert actual["scan"]["status"] == "pass", actual["scan"].get("issues")
    assert actual_rc == 0, stderr.getvalue()
    assert actual["scan"]["options"]["base_ref"] == "origin/main"
    archive = root / "response-fixture.tar.gz"
    def exercise(payload, expected, label):
        # Payloads come from canonical build_dialogue; only negative cases alter them.
        scanner = "import json,sys; assert '--intent' in sys.argv; assert '--base-ref' in sys.argv; assert '--consistency-base-ref' not in sys.argv; print(" + repr(json.dumps(payload)) + ")"
        with tarfile.open(archive, "w:gz") as tf:
            for name, body in {"scripts/readiness_scan.py":scanner, "scripts/consistency_gate.py":"print('{\"status\":\"pass\",\"mode\":\"shadow\"}')"}.items():
                raw = body.encode()
                member = tarfile.TarInfo("repo-preflight/" + name)
                member.size = len(raw)
                tf.addfile(member, io.BytesIO(raw))
        m.SOURCE_ARCHIVE = archive
        m.REPO_PREFLIGHT_ARCHIVE_SHA256 = hashlib.sha256(archive.read_bytes()).hexdigest()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            rc = m.main(["--repo", str(repo), "--cache", str(root / label), "--base-ref", "origin/main", "--intent", "push"])
        assert rc == expected, label
    scan = {"schema":"repo-preflight.scan/v3", "status":"pass", "checks":{"origin":{"status":"pass"}}}
    ready = gate.build_dialogue(intent="push", scan=scan)
    assert ready["status"] == "ready_after_confirmation"
    needs = gate.build_dialogue(intent="push", scan={**scan, "checks":{}})
    assert needs["status"] == "needs_human_input"
    tool_error = gate.build_dialogue(intent="push", scan={**scan, "status":"tool_error"})
    assert tool_error["status"] == "blocked"
    exercise(ready, 0, "ready")
    exercise(needs, 0, "needs-human")
    exercise(tool_error, 1, "embedded-tool-error")
    missing = copy.deepcopy(ready)
    del missing["scan"]
    exercise(missing, 1, "missing-scan")
    malformed = copy.deepcopy(ready)
    malformed["scan"] = []
    exercise(malformed, 1, "invalid-scan")
    bad_schema = copy.deepcopy(ready)
    bad_schema["scan"]["schema"] = "unknown"
    exercise(bad_schema, 1, "invalid-scan-schema")
    bad_status = copy.deepcopy(ready)
    bad_status["scan"]["status"] = {"unexpected":"pass"}
    exercise(bad_status, 1, "invalid-scan-status")
    bad_outer = copy.deepcopy(ready)
    bad_outer["schema"] = "unknown"
    exercise(bad_outer, 1, "invalid-dialogue-schema")
    print(json.dumps({"canonical_push_fixture":"pass", "ready_observation":True, "human_question_observation":True, "embedded_tool_error_rejected":True, "missing_or_invalid_scan_rejected":True, "schema_bound":True}))
`;
  const result = spawnSync("python3", ["-B", "-c", script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"canonical_push_fixture": "pass"/);
});
