import type { MvsepProgressEvent } from "./types.js";
export interface MvsepDiagnostic {
    at: string;
    type: MvsepProgressEvent["type"];
    path?: string;
    phase?: string;
    attempt?: number;
    elapsedMs?: number;
    waitMs?: number;
    status?: string | number;
    /** No URLs, API keys, filenames or request bodies are retained. */
    [key: string]: unknown;
}
export declare class MvsepDiagnostics {
    private readonly capacity;
    private readonly records;
    private readonly listeners;
    private readonly started;
    constructor(capacity?: number);
    /** Pass this.onProgress to the client and/or individual calls. */
    onProgress: (event: MvsepProgressEvent) => void;
    subscribe(listener: (record: MvsepDiagnostic) => void): () => void;
    snapshot(): readonly MvsepDiagnostic[];
    clear(): void;
}
//# sourceMappingURL=diagnostics.d.ts.map