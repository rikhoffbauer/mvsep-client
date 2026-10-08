import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import type { SeparationAlgorithm } from "./types.js";
import type { MetadataCache } from "./extended-types.js";

export interface AlgorithmSnapshot {
  expiresAt: number;
  algorithms: SeparationAlgorithm[];
}

/** Atomic filesystem-backed algorithm metadata cache.
 *  readSnapshot() can be used offline even when the normal client TTL has elapsed.
 */
export class FileMetadataCache implements MetadataCache {
  constructor(readonly directory: string) {}

  private path(key: string): string {
    if (!key || key.length > 10_000) throw new TypeError("Invalid metadata cache key");
    const name = createHash("sha256").update(key).digest("hex");
    return join(this.directory, "algorithms-" + name + ".json");
  }

  async get(key: string): Promise<AlgorithmSnapshot | null> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.path(key), "utf8"));
      if (!parsed || typeof parsed !== "object" || !("expiresAt" in parsed) ||
          !("algorithms" in parsed) || !Array.isArray(parsed.algorithms) ||
          typeof parsed.expiresAt !== "number") {
        throw new TypeError("Corrupt algorithm metadata snapshot");
      }
      return parsed as AlgorithmSnapshot;
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw cause;
    }
  }

  async readSnapshot(key = "single_upload"): Promise<AlgorithmSnapshot | null> {
    return this.get(key);
  }

  async set(key: string, value: AlgorithmSnapshot): Promise<void> {
    if (!Number.isFinite(value.expiresAt) || !Array.isArray(value.algorithms))
      throw new TypeError("Invalid algorithm snapshot");
    await mkdir(this.directory, { recursive: true });
    const destination = this.path(key);
    const temporary = destination + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true }).catch(() => {});
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}
