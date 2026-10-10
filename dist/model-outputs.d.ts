import type { WorkflowModel, WorkflowOptionValues } from './workflow.js';
/** Resolve model-specific output hints, including known option-dependent variants. */
export declare function stemsForModel<S extends string>(definition: WorkflowModel<S>, options?: WorkflowOptionValues): readonly S[];
//# sourceMappingURL=model-outputs.d.ts.map