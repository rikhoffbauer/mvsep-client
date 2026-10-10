import type { WorkflowModel, WorkflowOptionValues } from './workflow.js';
import type { SeparationAlgorithm } from './types.js';
/** Metadata-driven selection, analogous to yt-dlp format expressions. No remote jobs. */
export type ModelSelectionPreference = 'best' | 'cheapest' | 'fewest';
export interface ModelSelectionRequest {
    stems: readonly string[];
    prefer?: ModelSelectionPreference;
    /** Maximum MVSep separations; currently one or two. Default: 2. */
    maxJobs?: 1 | 2;
    /** Sum of published coefficients, not a credit quote. */
    maxPriceCoefficient?: number;
    /** Force a specific single model, if compatible. */
    modelId?: number;
    /** Limit candidates to model IDs, including any intermediate steps. */
    allowedModelIds?: readonly number[];
    excludedModelIds?: readonly number[];
}
export interface ModelSelectionStep {
    modelId: number;
    name: string;
    options: WorkflowOptionValues;
    /** Absence means the original audio source; otherwise the output from an earlier step. */
    input?: {
        step: number;
        stem: string;
    };
    stems: readonly string[];
}
export interface ModelSelectionOutput {
    step: number;
    stem: string;
}
export interface ModelSelectionPlan {
    steps: readonly ModelSelectionStep[];
    /** Requested stem -> exact step/actual MVSep output key, to disambiguate duplicates. */
    outputs: Readonly<Record<string, ModelSelectionOutput>>;
    /** Sum of MVSep price coefficients. Actual credits depend on duration and account. */
    priceCoefficient: number | null;
    /** Weighted community rating, 0–5. Null if insufficient metadata. NOT objective audio quality. */
    communityRating: number | null;
    /** Human-readable selection evidence. */
    reasons: readonly string[];
}
type ProfiledModel = WorkflowModel<string> & {
    id: number;
};
/** Parse e.g. best[vocals+drums+kick] or cheapest[vocals,other]@20. */
export declare function parseModelSelector(selector: string): ModelSelectionRequest;
/**
 * Rank compatible 1–2 model workflows for exact requested stems.
 * No MVSep requests or paid jobs. Only known published output profiles qualify.
 */
export declare function rankModels(selector: string | ModelSelectionRequest, models?: readonly (ProfiledModel | SeparationAlgorithm)[], limit?: number): ModelSelectionPlan[];
/** Return the highest-ranked plan or explain why no published model can meet it. */
export declare function selectModels(selector: string | ModelSelectionRequest, models?: readonly (ProfiledModel | SeparationAlgorithm)[]): ModelSelectionPlan;
export {};
//# sourceMappingURL=model-selector.d.ts.map