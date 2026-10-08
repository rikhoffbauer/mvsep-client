import type { CreateSeparationInput } from "./types.js";
/** Manifest entry refers only to verified local files; never remote job caches. */
export interface ArtifactCacheEntry {
    key: string;
    inputHash: string;
    modelRevision: string;
    accountId: string;
    createdAt: string;
    outputs: Array<{
        path: string;
        sha256: string;
        bytes: number;
    }>;
}
/**
 * Explicit local-artifact cache, never a promise of remote deduplication.
 * Caller supplies a stable model revision and non-secret account identity.
 */
export declare class LocalArtifactCache {
    readonly root: string;
    constructor(root: string);
    keyForFile(filePath: string, config: {
        modelRevision: string;
        accountId: string;
        separation: Pick<CreateSeparationInput, "sepType" | "presetId" | "addOpt1" | "addOpt2" | "addOpt3" | "outputFormat" | "additionalOptions">;
    }): Promise<{
        key: string;
        inputHash: string;
    }>;
    lookup(key: string): Promise<ArtifactCacheEntry | null>;
    record(params: {
        key: string;
        inputHash: string;
        accountId: string;
        modelRevision: string;
        paths: readonly string[];
    }): Promise<ArtifactCacheEntry>;
}
//# sourceMappingURL=local-cache.d.ts.map