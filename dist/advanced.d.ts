import { MvsepClient as BaseClient } from "./client.js";
import type { CallOptions, CreateSeparationInput, MvsepClientOptions, SeparationAlgorithm, SeparationResult } from "./types.js";
import type { CreateJobOptions, DemoQuery, GuardedCreateOptions, HistoryQuery, JobCostEstimate, JobHandleStore, JobWatchEvent, JobWatchOptions, LeaderboardQuery, MetadataCache, MvsepCreditAlert, MvsepDemoEntry, MvsepHistoryEntry, MvsepJobHandle, MvsepLeaderboard, MvsepPurchases, MvsepQueue, MvsepQueueSummary, MvsepQualityEntry, MvsepUser, NewsEntry, Pagination, PrepareSeparationOptions, PreparedSeparation, PurchaseQuery, ValidateOptions } from "./extended-types.js";
export interface AdvancedClientOptions extends MvsepClientOptions {
    /** Stable, non-secret account identifiers in apiKeys order. Required for safe multi-key recovery. */
    keyIdentifiers?: readonly string[];
    algorithmsCache?: MetadataCache;
    algorithmsCacheTtlMs?: number;
}
/** Lazily opened, disk-backed Blob on Node 20+ and Bun. */
export declare function fileBlobFromPath(path: string, contentType?: string): Promise<{
    contentType?: string;
    data: Blob;
    filename: string;
}>;
/** Full featured client. The transport-only class is also available as MvsepCoreClient. */
export declare class MvsepClient extends BaseClient {
    private readonly identifiers;
    private readonly cache;
    private readonly cacheTtlMs;
    constructor(options?: AdvancedClientOptions);
    getAlgorithms(scopes?: import("./types.js").AlgorithmScope | readonly import("./types.js").AlgorithmScope[], options?: CallOptions & {
        refresh?: boolean;
    }): Promise<SeparationAlgorithm[]>;
    invalidateAlgorithms(scopes?: string): Promise<void>;
    getAlgorithm(renderId: number, options?: CallOptions): Promise<SeparationAlgorithm>;
    prepareSeparation(options: PrepareSeparationOptions): PreparedSeparation;
    validateSeparation(input: CreateSeparationInput, algorithm: SeparationAlgorithm, options?: ValidateOptions): void;
    estimateJobCredits(options: {
        algorithm: number | SeparationAlgorithm;
        durationSeconds?: number;
    }): Promise<JobCostEstimate>;
    createGuardedSeparation(input: CreateSeparationInput, options: GuardedCreateOptions): Promise<import("./types.js").CreateSeparationResponse>;
    getUser(options?: CallOptions & {
        includeApiToken?: boolean;
    }): Promise<MvsepUser>;
    getQueue(options?: CallOptions): Promise<MvsepQueue>;
    getQueueSummary(options?: CallOptions): Promise<MvsepQueueSummary>;
    getSeparationHistory(query?: HistoryQuery, options?: CallOptions): Promise<MvsepHistoryEntry[]>;
    getPurchases(query?: PurchaseQuery, options?: CallOptions): Promise<MvsepPurchases>;
    getCreditAlert(options?: CallOptions): Promise<MvsepCreditAlert>;
    setCreditAlert(threshold: number, options?: CallOptions): Promise<MvsepCreditAlert>;
    setPremiumUsageEnabled(enabled: boolean, options?: CallOptions): Promise<void>;
    setLongFilenamesEnabled(enabled: boolean, options?: CallOptions): Promise<void>;
    getNews(query?: Pagination & {
        lang?: string;
    }, options?: CallOptions): Promise<NewsEntry[]>;
    getDemoSeparations(query?: DemoQuery, options?: CallOptions): Promise<MvsepDemoEntry[]>;
    getQualityLeaderboard(query?: LeaderboardQuery, options?: CallOptions): Promise<MvsepLeaderboard>;
    getQualityQueue(query?: Pagination, options?: CallOptions): Promise<MvsepQualityEntry[]>;
    getQualityEntry(id: number, options?: CallOptions): Promise<MvsepQualityEntry>;
    createSeparationFromFile(path: string, input?: Omit<CreateSeparationInput, "audiofile" | "url">, options?: CallOptions): Promise<import("./types.js").CreateSeparationResponse>;
    createJob(input: CreateSeparationInput, options?: CreateJobOptions): Promise<MvsepJobHandle>;
    resumeJob(handle: MvsepJobHandle): string;
    waitForJob(handle: MvsepJobHandle, options?: import("./types.js").PollOptions): Promise<SeparationResult>;
    restoreJobHandles(store: JobHandleStore): Promise<MvsepJobHandle[]>;
    saveJobHandles(store: JobHandleStore, handles: readonly MvsepJobHandle[]): Promise<void>;
    /** Watch job state, with optional separately throttled account queue reports. */
    watchJob(hash: string, options?: JobWatchOptions): AsyncGenerator<JobWatchEvent>;
}
//# sourceMappingURL=advanced.d.ts.map