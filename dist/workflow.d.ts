/**
 * Browser/Node-compatible DAG composition for chained MVSep separations.
 * Graph construction makes no remote calls. Execution requires explicit invocation.
 */
import type { CallOptions, PollOptions, CreateSeparationInput, SeparationAlgorithm, SeparationResult } from './types.js';
export type AudioInput = string | WorkflowAudio;
export type WorkflowOptionValues = Record<string, string | number>;
export type WorkflowModel<Stems extends string = string> = Readonly<{
    id: number;
    name: string;
    stems: readonly Stems[];
}>;
/** Known port hints, not promises: actual stem names can change with upstream model options. */
export declare const Models: Readonly<{
    Demucs4_HT: Readonly<{
        id: number;
        name: string;
        stems: readonly ("drums" | "vocals" | "other" | "bass")[];
    }>;
    DrumSep: Readonly<{
        id: number;
        name: string;
        stems: readonly ("hh" | "hihat" | "crash" | "ride" | "kick" | "cymbals" | "crash_ride" | "toms" | "snare")[];
    }>;
    MVSep_Synth: Readonly<{
        id: number;
        name: string;
        stems: readonly ("other" | "synth")[];
    }>;
}>;
export interface WorkflowSourceNode {
    id: string;
    type: 'source';
    label: string;
    url: string;
}
export interface WorkflowSeparationNode {
    id: string;
    type: 'separate';
    label: string;
    algorithmId: number;
    /** Only declared MVSep fields: add_opt1..add_opt3, or their displayed names. */
    options: WorkflowOptionValues;
    input: {
        nodeId: string;
        stem: string;
    };
    /** Hints for available outputs. Runtime verifies their actual names. */
    stems: string[];
}
export type WorkflowNode = WorkflowSourceNode | WorkflowSeparationNode;
export interface WorkflowDocument {
    version: 1;
    nodes: WorkflowNode[];
}
export type WorkflowStepState = 'queued' | 'running' | 'done' | 'failed';
export interface WorkflowEvent {
    nodeId: string;
    state: WorkflowStepState;
    hash?: string;
    /** Resolved outputs are public upstream audio download URLs. */
    outputs?: Readonly<Record<string, string>>;
    error?: string;
}
export interface WorkflowRunResult {
    steps: Record<string, {
        hash: string;
        status: string;
        outputs: Record<string, string>;
    }>;
}
export interface WorkflowExecutor {
    getAlgorithm(id: number, options?: CallOptions): Promise<SeparationAlgorithm>;
    createSeparation(input: CreateSeparationInput, options?: CallOptions): Promise<{
        data?: {
            hash?: string;
        };
    }>;
    waitForSeparation(hash: string, options?: PollOptions): Promise<SeparationResult>;
}
export interface WorkflowRunOptions {
    signal?: AbortSignal;
    onEvent?: (event: WorkflowEvent) => void;
    /** Maximum number of simultaneously executing remote jobs. Defaults to 1. */
    concurrency?: number;
    /** Explicit opt-in; prevents accidental paid submissions from tooling. */
    allowPaid?: boolean;
    /** Invoked before each new paid POST, including downstream jobs. */
    confirmSubmit?: (node: WorkflowSeparationNode, resolvedInput: string) => boolean | Promise<boolean>;
    maxWaitMs?: number;
    /** Reuse previously completed jobs without re-submitting. Outputs are checked against selected stems. */
    completed?: WorkflowRunResult['steps'];
}
/** A strict resolver: never guess based on result ordering. */
export declare function resolveStem(available: Record<string, string>, requested: string): string;
/** Converts upstream response file labels to a strictly validated lookup. */
export declare function separationOutputs(result: SeparationResult): Record<string, string>;
export declare class WorkflowGraph {
    private nodes;
    private nextId;
    constructor(document?: WorkflowDocument);
    get document(): WorkflowDocument;
    get allNodes(): readonly WorkflowNode[];
    source(url: string, label?: string): WorkflowAudio;
    /** Add a model node with an already defined audio input. */
    add<S extends string>(input: WorkflowAudio, definition: WorkflowModel<S>, options?: WorkflowOptionValues): WorkflowOutputs<S>;
    addNode(input: WorkflowAudio, modelId: number, label: string, stems: readonly string[], options?: WorkflowOptionValues): Record<string, WorkflowAudio>;
    /** Replace a graph from a JSON document; reject invalid dependencies and cycles. */
    load(document: WorkflowDocument): void;
    static from(document: WorkflowDocument): WorkflowGraph;
    private id;
    audio(nodeId: string, stem?: string): WorkflowAudio;
    validate(): WorkflowNode[];
    run(executor: WorkflowExecutor, options?: WorkflowRunOptions): Promise<WorkflowRunResult>;
}
export declare class WorkflowAudio {
    readonly graph: WorkflowGraph;
    readonly nodeId: string;
    readonly stem: string;
    constructor(graph: WorkflowGraph, nodeId: string, stem: string);
    pipe<S extends string>(operation: WorkflowOperation<S>): WorkflowOutputs<S>;
}
export type WorkflowOutputs<S extends string> = Record<S, WorkflowAudio>;
export declare class WorkflowOperation<S extends string> {
    readonly definition: WorkflowModel<S>;
    readonly options: WorkflowOptionValues;
    constructor(definition: WorkflowModel<S>, options?: WorkflowOptionValues);
    pipe(input: AudioInput): WorkflowOutputs<S>;
}
export declare function separate<S extends string>(model: WorkflowModel<S>, options?: WorkflowOptionValues): WorkflowOperation<S>;
export declare function modelFromAlgorithm(algorithm: SeparationAlgorithm, stems: readonly string[]): WorkflowModel<string>;
//# sourceMappingURL=workflow.d.ts.map