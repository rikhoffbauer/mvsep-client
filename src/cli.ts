#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { MvsepClient, fileBlobFromPath } from "./advanced.js";
import { runBatch } from "./batch.js";
import type { CreateSeparationInput } from "./types.js";
import type { BatchInput, MvsepJobHandle } from "./extended-types.js";

const help = `Usage: mvsep <command> [args] [--json]

Commands:
  models                           List available algorithms
  status HASH                      Get job status
  wait HASH                        Wait for job completion
  submit --file FILE --algorithm N  Submit a single job (also --url URL or --preset N)
  resume HANDLE.json               Wait for a saved job handle without re-submitting
  cancel HASH                      Cancel a job on MVSep
  delete HASH                      Delete a job on MVSep
  download HASH DIRECTORY          Download all outputs
  batch MANIFEST.json              Submit or resume a checked-pointed JSON batch
Environment:
  MVSEP_API_KEY or MVSEP_API_KEYS (comma-separated)
  MVSEP_KEY_IDS (optional comma-separated stable non-secret identifiers)
  MVSEP_BASE_URL (optional)
`;
function parse(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) { positional.push(arg); continue; }
    const key = arg.slice(2);
    if (!key || flags[key] !== undefined) throw new TypeError("Duplicate or empty flag: " + arg);
    if (key === "json") flags[key] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new TypeError("Missing value for " + arg);
      flags[key] = value;
    }
  }
  return { positional, flags };
}
function numberFlag(value: string | boolean | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError("Invalid --" + name);
  return number;
}
function emit(value: unknown, json: boolean): void {
  process.stdout.write(JSON.stringify(value, null, json ? 2 : 2) + "\n");
}
async function main(): Promise<void> {
  const { positional, flags } = parse(process.argv.slice(2));
  const [command, arg, other] = positional;
  if (!command || command === "help" || flags.help) { process.stdout.write(help); return; }
  const keys = (process.env.MVSEP_API_KEYS ?? process.env.MVSEP_API_KEY ?? "").split(",").map(k => k.trim()).filter(Boolean);
  const ids = (process.env.MVSEP_KEY_IDS ?? "").split(",").map(k => k.trim()).filter(Boolean);
  const client = new MvsepClient({
    apiKeys: keys,
    ...(ids.length ? { keyIdentifiers: ids } : {}),
    ...(process.env.MVSEP_BASE_URL ? { baseUrl: process.env.MVSEP_BASE_URL } : {}),
  });
  const json = Boolean(flags.json);
  if (command === "models") { emit(await client.getAlgorithms(["single_upload","no_upload","matchering_upload"]), json); return; }
  if (command === "status" && arg) { emit(await client.getSeparation(arg), json); return; }
  if (command === "wait" && arg) { emit(await client.waitForSeparation(arg), json); return; }
  if (command === "cancel" && arg) { emit(await client.cancelSeparation(arg), json); return; }
  if (command === "delete" && arg) { emit(await client.deleteSeparation(arg), json); return; }
  if (command === "resume" && arg) {
    const handle = JSON.parse(await readFile(arg, "utf8")) as MvsepJobHandle;
    emit(await client.waitForJob(handle), json);
    return;
  }
  if (command === "submit") {
    const file = flags.file;
    const url = flags.url;
    const algorithm = numberFlag(flags.algorithm, "algorithm");
    const preset = numberFlag(flags.preset, "preset");
    if ((algorithm === undefined) === (preset === undefined))
      throw new TypeError("Specify exactly one --algorithm or --preset");
    if ((file === undefined) === (url === undefined))
      throw new TypeError("Specify exactly one --file or --url");
    const input: CreateSeparationInput = {
      ...(algorithm !== undefined ? { sepType: algorithm } : {}),
      ...(preset !== undefined ? { presetId: preset } : {}),
      ...(typeof file === "string" ? { audiofile: await fileBlobFromPath(file) } : {}),
      ...(typeof url === "string" ? { url } : {}),
    };
    const handle = await client.createJob(input);
    if (typeof flags.handle === "string") {
      await writeFile(flags.handle, JSON.stringify(handle, null, 2) + "\n", { flag: "wx" });
    }
    emit(handle, json);
    return;
  }
  if (command === "download" && arg && other) {
    await mkdir(other, { recursive: true });
    emit(await client.downloadSeparationOutputs(arg, other), json);
    return;
  }
  if (command === "batch" && arg) {
    const raw = JSON.parse(await readFile(arg, "utf8")) as {
      jobs: Array<{ id: string; file?: string; url?: string; algorithm?: number; preset?: number; durationSeconds?: number }>;
      maxActiveJobs?: number;
      maxEstimatedCredits?: number;
    };
    if (!Array.isArray(raw.jobs)) throw new TypeError("Manifest requires jobs array");
    const input: BatchInput[] = [];
    for (const item of raw.jobs) {
      if ((item.file === undefined) === (item.url === undefined)) throw new TypeError("Each job requires a file or URL");
      const separation: CreateSeparationInput = {
        ...(item.algorithm !== undefined ? { sepType: item.algorithm } : {}),
        ...(item.preset !== undefined ? { presetId: item.preset } : {}),
        ...(item.file ? { audiofile: await fileBlobFromPath(item.file) } : {}),
        ...(item.url ? { url: item.url } : {}),
      };
      input.push({ id: item.id, input: separation, ...(item.durationSeconds !== undefined ? { durationSeconds: item.durationSeconds } : {}) });
    }
    const checkpointPath = arg + ".checkpoint.json";
    const store = {
      async load(): Promise<MvsepJobHandle[]> {
        try { return JSON.parse(await readFile(checkpointPath, "utf8")) as MvsepJobHandle[]; }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
      },
      async save(handles: readonly MvsepJobHandle[]): Promise<void> {
        await writeFile(checkpointPath + ".tmp", JSON.stringify(handles, null, 2) + "\n");
        const { rename } = await import("node:fs/promises");
        await rename(checkpointPath + ".tmp", checkpointPath);
      },
    };
    emit(await runBatch(client, input, {
      checkpointStore: store,
      ...(raw.maxActiveJobs !== undefined ? { maxActiveJobs: raw.maxActiveJobs } : {}),
      ...(raw.maxEstimatedCredits !== undefined ? { maxEstimatedCredits: raw.maxEstimatedCredits } : {}),
    }), json);
    return;
  }
  throw new TypeError("Unknown or incomplete command.\n" + help);
}
main().catch(error => {
  process.stderr.write((error instanceof Error ? error.message : "Unknown error") + "\n");
  process.exitCode = error instanceof TypeError ? 2 : 1;
});
