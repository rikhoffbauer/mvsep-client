import { spawnSync } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(new URL("..", import.meta.url).pathname);
const work = await mkdtemp(join(tmpdir(), "mvsep-pack-smoke-"));
const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", env: process.env, timeout: 120_000 });
  if (result.status !== 0) {
    throw new Error([cmd, ...args].join(" ") + " failed:\n" + result.stdout + "\n" + result.stderr);
  }
  return result.stdout;
};
try {
  const raw = run("npm", ["pack", "--json", "--pack-destination", work], root);
  const manifest = JSON.parse(raw)[0];
  assert(manifest.filename.endsWith(".tgz"));
  const names = manifest.files.map(f => f.path);
  for (const path of ["dist/index.js", "dist/index.d.ts", "dist/cli.js", "dist/client.js.map"])
    assert(names.includes(path), path + " missing from packed artifact");
  assert(!names.some(name => name.startsWith("src/")), "source files should not be required for sourcemaps");
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", work,
    join(work, manifest.filename)], work);
  await writeFile(join(work, "consumer.mjs"),
    'import { MvsepClient, estimateJobCredits } from "@rikhoffbauer/mvsep-client";\n' +
    'import { runBatch } from "@rikhoffbauer/mvsep-client/batch";\n' +
    'import { LocalArtifactCache } from "@rikhoffbauer/mvsep-client/local-cache";\n' +
    'import { MvsepDiagnostics } from "@rikhoffbauer/mvsep-client/diagnostics";\n' +
    'if (!(new MvsepClient() instanceof MvsepClient) || !runBatch || !LocalArtifactCache || !MvsepDiagnostics || !estimateJobCredits) process.exit(1);\n');
  run("node", ["consumer.mjs"], work);
  const cli = join(work, "node_modules", ".bin", "mvsep");
  const usage = run(cli, ["help"], work);
  assert(usage.includes("Usage: mvsep"), "CLI executable missing or unusable");
  const map = JSON.parse(await readFile(join(work, "node_modules/@rikhoffbauer/mvsep-client/dist/client.js.map"), "utf8"));
  assert(map.sourcesContent?.some(content => content.includes("class MvsepClient")),
    "Published sourcemap must include original source");
  await writeFile(join(work, "typecheck.ts"),
    'import { MvsepClient, type MvsepJobHandle } from "@rikhoffbauer/mvsep-client";\n' +
    'const client = new MvsepClient();\n' +
    'const handle: MvsepJobHandle = { version: 1, hash: "x", baseUrl: client.baseUrl, createdAt: "2026-10-08" };\n' +
    'void handle; void client.getQueueSummary();\n');
  run("node", [join(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--skipLibCheck",
    "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext",
    join(work, "typecheck.ts")], work);
  process.stdout.write("Package smoke PASS: tarball files, ESM, subpaths, CLI, sourcemaps, TypeScript declarations\n");
} finally {
  await rm(work, { recursive: true, force: true });
}
