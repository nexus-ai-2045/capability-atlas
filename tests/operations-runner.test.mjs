import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runOnce } from "../scripts/lib/operations-runner.mjs";

test("fixtureを観測し、安全な次の1手と監査可能な証跡を保存する", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  const result = await runOnce({
    fixturePath: new URL("./fixtures/capabilities.json", import.meta.url),
    outputDir,
    allowedOutputRoot: outputDir,
    now: new Date("2026-08-22T00:00:00.000Z"),
  });

  assert.equal(result.receipt.schemaVersion, 1);
  assert.equal(result.receipt.scope, "local-fixture-only");
  assert.equal(result.receipt.changedFiles.length, 1);
  assert.equal(result.receipt.plan.actions[0].operation, "local_read_smoke");
  assert.equal(result.receipt.plan.route, "safe_local");
  assert.equal(result.receipt.planned, true);
  assert.equal(result.receipt.executed, false);
  assert.match(result.receipt.inputHash, /^sha256:/);
  assert.doesNotMatch(JSON.stringify(result.receipt), /must-not-leak|token/);

  const persisted = JSON.parse(await readFile(result.receiptPath, "utf8"));
  assert.deepEqual(persisted, result.receipt);
});

test("未知の操作は実行せずblocked_unknownとして記録する", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  const result = await runOnce({
    fixturePath: new URL("./fixtures/unknown-operation.json", import.meta.url),
    outputDir,
    allowedOutputRoot: outputDir,
    now: new Date("2026-08-22T00:00:00.000Z"),
  });

  assert.equal(result.receipt.plan.route, "blocked_unknown");
  assert.equal(result.receipt.executed, false);
});

test("同時runでも証跡pathが衝突しない", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  const options = {
    fixturePath: new URL("./fixtures/capabilities.json", import.meta.url),
    outputDir,
    allowedOutputRoot: outputDir,
    now: new Date("2026-08-22T00:00:00.000Z"),
  };
  const [left, right] = await Promise.all([runOnce(options), runOnce(options)]);
  assert.notEqual(left.receiptPath, right.receiptPath);
});

test("不正schemaと許可root外への書き込みをfail closedにする", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  await assert.rejects(
    runOnce({
      fixturePath: new URL("./fixtures/invalid.json", import.meta.url),
      outputDir,
      allowedOutputRoot: outputDir,
    }),
    /invalid capability/,
  );
  await assert.rejects(
    runOnce({
      fixturePath: new URL("./fixtures/capabilities.json", import.meta.url),
      outputDir,
      allowedOutputRoot: path.join(outputDir, "child"),
    }),
    /outside allowed root/,
  );
  await assert.rejects(
    runOnce({ fixturePath: new URL("./fixtures/capabilities.json", import.meta.url), outputDir }),
    /allowed output root is required/,
  );
});

test("重複idをfail closedにする", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  await assert.rejects(runOnce({
    fixturePath: new URL("./fixtures/duplicate.json", import.meta.url),
    outputDir,
    allowedOutputRoot: outputDir,
  }), /duplicate capability id/);
});

test("不正lifecycleを拒否し、宣言された実行上限をplannerへ渡す", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  await assert.rejects(runOnce({
    fixturePath: new URL("./fixtures/invalid-lifecycle.json", import.meta.url), outputDir, allowedOutputRoot: outputDir,
  }), /invalid capability lifecycle/);
  const result = await runOnce({
    fixturePath: new URL("./fixtures/over-bounds.json", import.meta.url), outputDir, allowedOutputRoot: outputDir,
  });
  assert.equal(result.receipt.plan.route, "blocked_unknown");
  assert.deepEqual(result.receipt.plan.rejected, [{ id: "bounded", reason: "input_bound_exceeded" }]);
});

test("collector failureをdrift evidenceとして保存する", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  const result = await runOnce({
    fixturePath: new URL("./fixtures/collector-failed.json", import.meta.url), outputDir, allowedOutputRoot: outputDir,
  });
  assert.ok(result.receipt.driftEvents.some(({ type }) => type === "collector_failed"));
});

test("未知のcollector statusをfail closedにする", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "atlas-runner-"));
  await assert.rejects(runOnce({
    fixturePath: new URL("./fixtures/collector-invalid.json", import.meta.url), outputDir, allowedOutputRoot: outputDir,
  }), /invalid collector status/);
});
