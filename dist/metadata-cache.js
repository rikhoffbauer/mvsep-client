import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
/** Atomic filesystem-backed algorithm metadata cache.
 *  readSnapshot() can be used offline even when the normal client TTL has elapsed.
 */
export class FileMetadataCache {
    directory;
    constructor(directory) {
        this.directory = directory;
    }
    path(key) {
        if (!key || key.length > 10_000)
            throw new TypeError("Invalid metadata cache key");
        const name = createHash("sha256").update(key).digest("hex");
        return join(this.directory, "algorithms-" + name + ".json");
    }
    async get(key) {
        try {
            const parsed = JSON.parse(await readFile(this.path(key), "utf8"));
            if (!parsed || typeof parsed !== "object" || !("expiresAt" in parsed) ||
                !("algorithms" in parsed) || !Array.isArray(parsed.algorithms) ||
                typeof parsed.expiresAt !== "number") {
                throw new TypeError("Corrupt algorithm metadata snapshot");
            }
            return parsed;
        }
        catch (cause) {
            if (cause.code === "ENOENT")
                return null;
            throw cause;
        }
    }
    async readSnapshot(key = "single_upload") {
        return this.get(key);
    }
    async set(key, value) {
        if (!Number.isFinite(value.expiresAt) || !Array.isArray(value.algorithms))
            throw new TypeError("Invalid algorithm snapshot");
        await mkdir(this.directory, { recursive: true });
        const destination = this.path(key);
        const temporary = destination + "." + randomUUID() + ".tmp";
        try {
            await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
            await rename(temporary, destination);
        }
        finally {
            await rm(temporary, { force: true }).catch(() => { });
        }
    }
    async delete(key) {
        await rm(this.path(key), { force: true });
    }
}
//# sourceMappingURL=metadata-cache.js.map