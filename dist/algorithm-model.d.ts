import type { SeparationAlgorithm } from './types.js';
import type { WorkflowModel } from './workflow.js';
/** Build a model descriptor from current API metadata, including output names and option variants. */
export declare function modelFromAlgorithm(algorithm: SeparationAlgorithm, suppliedStems?: readonly string[]): WorkflowModel<string>;
//# sourceMappingURL=algorithm-model.d.ts.map