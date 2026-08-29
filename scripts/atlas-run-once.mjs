import path from "node:path";
import { fileURLToPath } from "node:url";

import { runOnce } from "./lib/operations-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = process.argv[2] ?? path.join(root, "tests", "fixtures", "capabilities.json");
const outputDir = process.argv[3] ?? path.join(root, "artifacts", "evidence");

const result = await runOnce({ fixturePath, outputDir, allowedOutputRoot: path.join(root, "artifacts", "evidence") });
process.stdout.write(`${JSON.stringify(result.receipt, null, 2)}\n`);
