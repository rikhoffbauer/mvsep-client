import type { SeparationAlgorithm } from "./types.js";
import type { MetadataCache } from "./extended-types.js";
export interface AlgorithmSnapshot {
    expiresAt: number;
    algorithms: SeparationAlgorithm[];
}
/** Atomic filesystem-backed algorithm metadata cache.
 *  readSnapshot() can be used offline even when the normal client TTL has elapsed.
 */
export declare class FileMetadataCache implements MetadataCache {
    readonly directory: string;
    constructor(directory: string);
    private path;
    get(key: string): Promise<AlgorithmSnapshot | null>;
    readSnapshot(key?: string): Promise<AlgorithmSnapshot | null>;
    set(key: string, value: AlgorithmSnapshot): Promise<void>;
    delete(key: string): Promise<void>;
}
//# sourceMappingURL=metadata-cache.d.ts.map