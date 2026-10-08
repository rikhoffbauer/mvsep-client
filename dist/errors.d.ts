import type { SeparationResult } from "./types.js";
export declare function redactUrl(value: string): string;
export declare function redactText(value: string): string;
export interface MvsepErrorOptions {
    cause?: unknown;
    status?: number;
    response?: unknown;
    method?: string;
    url?: string;
    retryable?: boolean;
    apiKeyIndex?: number;
}
export declare class MvsepError extends Error {
    readonly status: number | undefined;
    readonly response: unknown;
    readonly method: string | undefined;
    readonly url: string | undefined;
    readonly retryable: boolean;
    readonly apiKeyIndex: number | undefined;
    constructor(message: string, options?: MvsepErrorOptions);
}
export declare class MvsepHttpError extends MvsepError {
    constructor(message: string, options?: MvsepErrorOptions);
}
export declare class MvsepApiError extends MvsepError {
    constructor(message: string, options?: MvsepErrorOptions);
}
export declare class MvsepAuthenticationError extends MvsepApiError {
    constructor(message: string, options?: MvsepErrorOptions);
}
export declare class MvsepRateLimitError extends MvsepHttpError {
    readonly retryAfterMs: number | undefined;
    constructor(message: string, options?: MvsepErrorOptions & {
        retryAfterMs?: number;
    });
}
export declare class MvsepTimeoutError extends MvsepError {
    constructor(message: string, options?: MvsepErrorOptions);
}
export declare class MvsepAbortError extends MvsepError {
    constructor(message?: string, options?: MvsepErrorOptions);
}
export declare class MvsepJobFailedError extends MvsepApiError {
    readonly result: SeparationResult;
    constructor(result: SeparationResult);
}
//# sourceMappingURL=errors.d.ts.map