import type { CreateSeparationInput, SeparationAlgorithm, SeparationResult } from "./types.js";
import type { JobCostEstimate, NormalizedOutput, PrepareSeparationOptions, PreparedSeparation, ValidateOptions } from "./extended-types.js";
/** Unknown prices are null, never treated as free. */
export declare function estimateJobCredits(algorithm: SeparationAlgorithm, durationSeconds?: number): JobCostEstimate;
/** Validate a configured separation against a live algorithm metadata snapshot. */
export declare function validateSeparation(input: CreateSeparationInput, algorithm: SeparationAlgorithm, options?: ValidateOptions): void;
/** Maps only documented field names; never guesses option indices. */
export declare function prepareSeparation(options: PrepareSeparationOptions): PreparedSeparation;
/** Normalize output entries without inventing stem names or discarding raw metadata. */
export declare function getOutputFiles(result: SeparationResult): NormalizedOutput[];
/** Sanitizes filenames to a single portable basename (no path traversal). */
export declare function safeOutputFilename(name: string): string;
/** MVSep documents an unsigned POST of the GET /separation/get envelope. */
export declare function parseWebhook(body: string | unknown): SeparationResult;
/**
 * Webhooks are untrusted: correlate hashes, then optionally verify using the API.
 * Caller must independently authenticate the HTTP request.
 */
export declare function reconcileWebhook(hash: string, payload: unknown, verify?: (hash: string) => Promise<SeparationResult>): Promise<SeparationResult>;
//# sourceMappingURL=metadata.d.ts.map