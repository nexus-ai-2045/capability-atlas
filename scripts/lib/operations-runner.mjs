import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectDrift, diffSnapshots, planNextActions } from "../../src/domain/operations.js";
import { LIFECYCLE } from "../../src/domain/capability.js";

const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_CAPABILITIES = 1000;
const SCORE_FIELDS = ["risk", "uncertainty", "staleness", "novelty", "blastRadius", "failedHistory"];

function filesystemPath(value) {
  return value instanceof URL ? fileURLToPath(value) : value;
}

function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateCapability(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`invalid capability at index ${index}`);
  for (const key of ["id", "operation", "runtime", "genre", "lifecycle"]) {
    if (typeof item[key] !== "string" || item[key].length === 0 || item[key].length > 200) {
      throw new Error(`invalid capability ${key} at index ${index}`);
    }
  }
  if (!LIFECYCLE.includes(item.lifecycle)) throw new Error(`invalid capability lifecycle at index ${index}`);
  for (const key of SCORE_FIELDS) {
    if (item[key] !== undefined && (!Number.isFinite(item[key]) || item[key] < 0 || item[key] > 10)) {
      throw new Error(`invalid capability ${key} at index ${index}`);
    }
  }
}

async function readSnapshot(inputPath) {
  const inputStat = await stat(inputPath);
  if (!inputStat.isFile() || inputStat.size > MAX_INPUT_BYTES) throw new Error("invalid capability input size");
  const input = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(input);
  const capabilities = Array.isArray(parsed) ? parsed : parsed?.capabilities;
  const collectorStatus = Array.isArray(parsed) ? undefined : parsed?.collectorStatus;
  if (!Array.isArray(parsed) && !new Set(["success", "failed"]).has(collectorStatus)) {
    throw new Error("invalid collector status");
  }
  if (!Array.isArray(capabilities) || capabilities.length === 0 || capabilities.length > MAX_CAPABILITIES) {
    throw new Error("capability fixture must be a bounded non-empty array");
  }
  capabilities.forEach(validateCapability);
  const ids = new Set();
  for (const capability of capabilities) {
    if (ids.has(capability.id)) throw new Error(`duplicate capability id: ${capability.id}`);
    ids.add(capability.id);
  }
  return { input, capabilities, collectorStatus };
}

function priority(item) {
  return SCORE_FIELDS.reduce((total, key) => total + Number(item[key] ?? 0), 0);
}

function planningCandidates(capabilities) {
  return capabilities.map((item) => Object.fromEntries(Object.entries({
      id: item.id,
      operation: item.operation,
      runtime: item.runtime,
      genre: item.genre,
      lifecycle: item.lifecycle,
      target: item.id,
      scope: "local-fixture-only",
      priority: priority(item),
      usesNetwork: item.usesNetwork,
      requiresAuth: item.requiresAuth,
      mutatesSettings: item.mutatesSettings,
      writesFiles: item.writesFiles,
      sendsExternally: item.sendsExternally,
      paidAction: item.paidAction,
      inputBytes: item.inputBytes,
      durationMs: item.durationMs,
    }).filter(([, value]) => value !== undefined)));
}

async function writeReceipt({ outputDir, allowedOutputRoot, receipt }) {
  if (!allowedOutputRoot) throw new Error("allowed output root is required");
  const rootPath = path.resolve(allowedOutputRoot);
  const requestedPath = path.resolve(outputDir);
  if (!inside(rootPath, requestedPath)) throw new Error("output directory is outside allowed root");
  const physicalRoot = await realpath(rootPath);
  const relative = path.relative(rootPath, requestedPath);
  let current = physicalRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error("output path must not contain symbolic links");
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
  const safeOutputDir = path.join(physicalRoot, relative);
  await mkdir(safeOutputDir, { recursive: true });
  const physicalOutput = await realpath(safeOutputDir);
  if (!inside(physicalRoot, physicalOutput)) throw new Error("physical output directory is outside allowed root");
  const outputInfo = await lstat(physicalOutput);
  if (!outputInfo.isDirectory() || outputInfo.isSymbolicLink()) throw new Error("output directory must be a real directory");

  const receiptName = `run-${receipt.startedAt.replaceAll(":", "-")}-${receipt.runId}.json`;
  const receiptPath = path.join(physicalOutput, receiptName);
  const temporaryPath = path.join(physicalOutput, `.${receiptName}.${randomUUID()}.tmp`);
  const persisted = { ...receipt, changedFiles: [receiptName] };
  const handle = await open(temporaryPath, "wx");
  try {
    await handle.writeFile(`${JSON.stringify(persisted, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, receiptPath);
  return { receiptPath, persisted };
}

export async function runOnce({ fixturePath, previousFixturePath, outputDir, allowedOutputRoot, now }) {
  const startedAt = (now ?? new Date()).toISOString();
  const inputPath = filesystemPath(fixturePath);
  const { input, capabilities, collectorStatus } = await readSnapshot(inputPath);
  const previous = previousFixturePath ? (await readSnapshot(filesystemPath(previousFixturePath))).capabilities : [];
  const previousSnapshot = { capabilities: previous };
  const currentSnapshot = { capabilities, collectorStatus };
  const plan = planNextActions({ candidates: planningCandidates(capabilities), maxCandidates: 3 });
  const finishedAt = (now ?? new Date()).toISOString();
  const receipt = {
    schemaVersion: 1,
    runId: randomUUID(),
    activity: "bounded_receding_horizon_run_once",
    actor: "capability-atlas",
    startedAt,
    finishedAt,
    scope: "local-fixture-only",
    source: path.basename(inputPath),
    inputHash: `sha256:${createHash("sha256").update(input).digest("hex")}`,
    observedCount: capabilities.length,
    diff: diffSnapshots(previousSnapshot, currentSnapshot),
    driftEvents: detectDrift(previousSnapshot, currentSnapshot),
    plan,
    planned: plan.actions.length > 0,
    executed: false,
    changedFiles: [],
    confidence: "fact",
  };
  const result = await writeReceipt({ outputDir, allowedOutputRoot, receipt });
  return { receipt: result.persisted, receiptPath: result.receiptPath };
}
