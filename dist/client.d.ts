import type { AlgorithmScope, ApiEnvelope, BinaryPart, CallOptions, CreateAndWaitOptions, CreateSeparationInput, CreateSeparationResponse, DownloadOptions, GetSeparationOptions, MvsepClientOptions, PollOptions, RawRequestInput, SeparationAlgorithm, SeparationResult } from "./types.js";
import type { DownloadFileOptions, StreamDownloadOptions, DownloadReceipt, DownloadedFile, OutputDownloadOptions, OutputManifest } from "./extended-types.js";
export declare class MvsepClient {
    readonly baseUrl: string;
    private readonly fetchImpl;
    private readonly retry;
    private readonly requestTimeoutMs;
    private readonly keyPool;
    private readonly limiter;
    private readonly semaphore;
    private transferInstance;
    private readonly defaultProgress;
    private readonly jobKeyAffinity;
    private readonly maxJobAffinities;
    constructor(options?: MvsepClientOptions);
    /** Node-only file transfers load lazily; browser clients can use the API transport without Node built-ins. */
    private transfers;
    get apiKeyState(): readonly {
        index: number;
        disabled: boolean;
        cooldownUntil: number;
    }[];
    getJobApiKeyIndex(hash: string): number | undefined;
    bindJobToApiKey(hash: string, apiKeyIndex: number): void;
    private waitForKeyCooldown;
    private rememberJobKey;
    forgetJobApiKey(hash: string): void;
    request<T>(input: RawRequestInput): Promise<T>;
    createSeparation(input: CreateSeparationInput, options?: CallOptions): Promise<CreateSeparationResponse>;
    getSeparation(hash: string, options?: GetSeparationOptions): Promise<SeparationResult>;
    getRemoteSeparation(hash: string, options?: CallOptions): Promise<SeparationResult>;
    cancelSeparation(hash: string, options?: CallOptions): Promise<ApiEnvelope<Record<string, unknown>>>;
    deleteSeparation(hash: string, options?: CallOptions): Promise<ApiEnvelope<Record<string, unknown>>>;
    getAlgorithms(scopes?: AlgorithmScope | readonly AlgorithmScope[], options?: CallOptions): Promise<SeparationAlgorithm[]>;
    waitForSeparation(hash: string, options?: PollOptions): Promise<SeparationResult>;
    createAndWait(input: CreateSeparationInput, options?: CreateAndWaitOptions): Promise<SeparationResult>;
    download(url: string, options?: DownloadOptions): Promise<Uint8Array>;
    downloadToStream(url: string, stream: WritableStream<Uint8Array>, options?: StreamDownloadOptions): Promise<DownloadReceipt>;
    downloadToFile(url: string, path: string, options?: DownloadFileOptions): Promise<DownloadedFile>;
    downloadSeparationOutputs(resultOrHash: SeparationResult | string, path: string, options?: OutputDownloadOptions): Promise<OutputManifest>;
    private authenticatedHashAction;
    private execute;
    private buildRawForm;
    private shouldRetry;
    private emit;
}
export declare function fileFromPath(path: string, contentType?: string): Promise<BinaryPart>;
//# sourceMappingURL=client.d.ts.map