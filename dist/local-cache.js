import { createReadStream } from "node:fs";
import { readFile, writeFile, rename, mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
function canonical(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return "[" + value.map(canonical).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}
async function digestFile(path) {
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of createReadStream(path)) {
        bytes += chunk.byteLength;
        hash.update(chunk);
    }
    return { sha256: hash.digest("hex"), bytes };
}
/**
 * Explicit local-artifact cache, never a promise of remote deduplication.
 * Caller supplies a stable model revision and non-secret account identity.
 */
export class LocalArtifactCache {
    root;
    constructor(root) {
        this.root = root;
    }
    async keyForFile(filePath, config) {
        if (!config.modelRevision.trim() || !config.accountId.trim())
            throw new TypeError("Cache requires a model revision and non-secret account identifier");
        if (config.separation.sepType === undefined && config.separation.presetId === undefined)
            throw new TypeError("Cache configuration must identify the algorithm or preset");
        const inputHash = (await digestFile(filePath)).sha256;
        const key = createHash("sha256").update(canonical({
            inputHash, modelRevision: config.modelRevision, accountId: config.accountId,
            separation: config.separation,
        })).digest("hex");
        return { key, inputHash };
    }
    async lookup(key) {
        if (!/^[a-f0-9]{64}$/.test(key))
            throw new TypeError("Invalid cache key");
        let entry;
        try {
            entry = JSON.parse(await readFile(join(this.root, key + ".json"), "utf8"));
        }
        catch (error) {
            if (error.code === "ENOENT")
                return null;
            throw error;
        }
        if (entry.key !== key || !Array.isArray(entry.outputs))
            throw new TypeError("Invalid cache manifest");
        for (const output of entry.outputs) {
            try {
                const actual = await digestFile(output.path);
                if (actual.bytes !== output.bytes || actual.sha256 !== output.sha256)
                    return null;
            }
            catch (error) {
                if (error.code === "ENOENT")
                    return null;
                throw error;
            }
        }
        return entry;
    }
    async record(params) {
        if (!/^[a-f0-9]{64}$/.test(params.key) || !/^[a-f0-9]{64}$/.test(params.inputHash))
            throw new TypeError("Invalid cache hashes");
        const outputs = [];
        for (const path of params.paths)
            outputs.push({ path: resolve(path), ...await digestFile(path) });
        const entry = {
            key: params.key, inputHash: params.inputHash, accountId: params.accountId,
            modelRevision: params.modelRevision, createdAt: new Date().toISOString(), outputs,
        };
        await mkdir(this.root, { recursive: true });
        const path = join(this.root, params.key + ".json");
        const temporary = path + "." + randomUUID() + ".tmp";
        try {
            await writeFile(temporary, JSON.stringify(entry, null, 2) + "\n", { mode: 0o600, flag: "wx" });
            await rename(temporary, path);
        }
        finally {
            const { rm } = await import("node:fs/promises");
            await rm(temporary, { force: true }).catch(() => { });
        }
        return entry;
    }
}
//# sourceMappingURL=local-cache.js.map