/**
 * Browser/Node-compatible DAG composition for chained MVSep separations.
 * Graph construction makes no remote calls. Execution requires explicit invocation.
 */
import type { CallOptions, PollOptions, CreateSeparationInput, SeparationAlgorithm, SeparationResult } from './types.js';
import { getOutputFiles, prepareSeparation } from './metadata.js';

export type AudioInput = string | WorkflowAudio;
export type WorkflowOptionValues = Record<string, string | number>;
export type WorkflowModel<Stems extends string = string> = Readonly<{
  id: number; name: string; stems: readonly Stems[];
}>;
function model<S extends string>(id: number, name: string, stems: readonly S[]): WorkflowModel<S> {
  return Object.freeze({ id, name, stems: Object.freeze([...stems]) });
}
/** Known port hints, not promises: actual stem names can change with upstream model options. */
export const Models = Object.freeze({
  Demucs4_HT: model(20, 'Demucs4 HT', ['drums', 'vocals', 'other', 'bass'] as const),
  DrumSep: model(37, 'DrumSep', ['hh', 'hihat', 'crash', 'ride', 'kick', 'cymbals', 'crash_ride', 'toms', 'snare'] as const),
  MVSep_Synth: model(88, 'MVSep Synth', ['synth', 'other'] as const),
});

export interface WorkflowSourceNode { id: string; type: 'source'; label: string; url: string }
export interface WorkflowSeparationNode {
  id: string; type: 'separate'; label: string; algorithmId: number;
  /** Only declared MVSep fields: add_opt1..add_opt3, or their displayed names. */
  options: WorkflowOptionValues;
  input: { nodeId: string; stem: string };
  /** Hints for available outputs. Runtime verifies their actual names. */
  stems: string[];
}
export type WorkflowNode = WorkflowSourceNode | WorkflowSeparationNode;
export interface WorkflowDocument { version: 1; nodes: WorkflowNode[] }
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
  steps: Record<string, { hash: string; status: string; outputs: Record<string, string> }>;
}
export interface WorkflowExecutor {
  getAlgorithm(id: number, options?: CallOptions): Promise<SeparationAlgorithm>;
  createSeparation(input: CreateSeparationInput, options?: CallOptions): Promise<{ data?: { hash?: string } }>;
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
function assertId(id: string) { if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new TypeError('Invalid node ID: ' + id); }
function normalizeStem(name: string): string {
  return name.toLowerCase().replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\b(hihat|hi hat|hi-hat)\b/g, 'hh')
    .replace(/\b(instrumental|instrum)\b/g, 'other')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
/** A strict resolver: never guess based on result ordering. */
export function resolveStem(available: Record<string, string>, requested: string): string {
  if (available[requested]) return available[requested];
  const needle = normalizeStem(requested);
  const matches = Object.entries(available).filter(([name]) => {
    const normalized = normalizeStem(name);
    return normalized === needle || normalized.split(/\s+/).includes(needle);
  });
  if (matches.length !== 1) throw new Error(
    `Cannot resolve stem "${requested}" (${matches.length} matches). Available: ${Object.keys(available).join(', ') || 'none'}`,
  );
  return matches[0]![1];
}
/** Converts upstream response file labels to a strictly validated lookup. */
export function separationOutputs(result: SeparationResult): Record<string, string> {
  const outputs: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const file of getOutputFiles(result)) {
    if (Object.hasOwn(outputs, file.name)) throw new Error('Duplicate output name: ' + file.name);
    outputs[file.name] = file.url;
  }
  if (!Object.keys(outputs).length) throw new Error('Completed separation produced no downloadable outputs');
  return outputs;
}

export class WorkflowGraph {
  private nodes: WorkflowNode[] = [];
  private nextId = 1;
  constructor(document?: WorkflowDocument) { if (document) this.load(document); }
  get document(): WorkflowDocument { return { version: 1, nodes: structuredClone(this.nodes) }; }
  get allNodes(): readonly WorkflowNode[] { return this.document.nodes; }
  source(url: string, label = 'Audio'): WorkflowAudio {
    if (!/^https:\/\/[^\s/]+/i.test(url)) throw new TypeError('Audio source must be a publicly reachable HTTPS URL');
    const id = this.id();
    this.nodes.push({ id, type: 'source', label, url });
    return new WorkflowAudio(this, id, 'source');
  }
  /** Add a model node with an already defined audio input. */
  add<S extends string>(input: WorkflowAudio, definition: WorkflowModel<S>, options: WorkflowOptionValues = {}): WorkflowOutputs<S> {
    if (input.graph !== this) throw new TypeError('Cannot connect different workflow graphs');
    const node: WorkflowSeparationNode = {
      id: this.id(), type: 'separate', label: definition.name, algorithmId: definition.id,
      options: { ...options }, input: { nodeId: input.nodeId, stem: input.stem }, stems: [...definition.stems],
    };
    this.nodes.push(node);
    return outputPorts(this, node.id, definition.stems);
  }
  addNode(input: WorkflowAudio, modelId: number, label: string, stems: readonly string[], options: WorkflowOptionValues = {}): Record<string, WorkflowAudio> {
    return this.add(input, model(modelId, label, stems), options);
  }
  /** Replace a graph from a JSON document; reject invalid dependencies and cycles. */
  load(document: WorkflowDocument): void {
    if (!document || document.version !== 1 || !Array.isArray(document.nodes)) throw new TypeError('Invalid workflow document version');
    const nodes = structuredClone(document.nodes);
    if (nodes.length > 100) throw new TypeError('Maximum 100 workflow nodes');
    for (const node of nodes) {
      if (!node || typeof node !== 'object') throw new TypeError('Invalid graph node');
      assertId(node.id);
      if (typeof node.label !== 'string') throw new TypeError('Invalid node label');
      if (node.type === 'source') {
        if (typeof node.url !== 'string' || !/^https:\/\/[^\s/]+/i.test(node.url)) throw new TypeError('Invalid audio source URL');
      } else if (node.type === 'separate') {
        if (!Number.isSafeInteger(node.algorithmId) || node.algorithmId < 0 || !node.input ||
            typeof node.input.nodeId !== 'string' || typeof node.input.stem !== 'string' ||
            !Array.isArray(node.stems) || node.stems.some(stem => typeof stem !== 'string') ||
            !node.options || typeof node.options !== 'object' || Array.isArray(node.options) ||
            Object.values(node.options).some(value => typeof value !== 'string' && typeof value !== 'number') ||
            Object.keys(node.options).some(key => !/^[a-zA-Z0-9_ ]{1,80}$/.test(key)))
          throw new TypeError('Invalid separation node');
      } else throw new TypeError('Unknown node type');
    }
    this.nodes = nodes;
    this.validate();
    this.nextId = Math.max(1, ...nodes.map(n => Number(n.id.replace(/^n/, '')) || 0)) + 1;
  }
  static from(document: WorkflowDocument) { return new WorkflowGraph(document); }
  private id(): string { while (this.nodes.some(n => n.id === 'n' + this.nextId)) this.nextId++; return 'n' + this.nextId++; }
  audio(nodeId: string, stem = 'source'): WorkflowAudio {
    if (!this.nodes.some(n => n.id === nodeId)) throw new TypeError('Unknown workflow node: ' + nodeId);
    return new WorkflowAudio(this, nodeId, stem);
  }
  validate(): WorkflowNode[] {
    const ids = new Map<string, WorkflowNode>();
    for (const node of this.nodes) {
      if (ids.has(node.id)) throw new TypeError('Duplicate workflow node ID: ' + node.id);
      ids.set(node.id, node);
    }
    const visiting = new Set<string>(); const complete = new Set<string>(); const order: WorkflowNode[] = [];
    const visit = (id: string) => {
      if (visiting.has(id)) throw new TypeError('Workflow contains a dependency cycle');
      if (complete.has(id)) return;
      const node = ids.get(id);
      if (!node) throw new TypeError('Unknown dependency: ' + id);
      visiting.add(id);
      if (node.type === 'separate') {
        const parent = ids.get(node.input.nodeId);
        if (!parent) throw new TypeError('Missing upstream node: ' + node.input.nodeId);
        if (parent.type === 'source' && node.input.stem !== 'source') throw new TypeError('Audio source exposes only the "source" output');
        if (parent.type === 'separate' && !parent.stems.includes(node.input.stem))
          throw new TypeError(`Upstream model does not declare output "${node.input.stem}"`);
        visit(parent.id);
      }
      visiting.delete(id); complete.add(id); order.push(node);
    };
    for (const node of this.nodes) visit(node.id);
    return order;
  }
  async run(executor: WorkflowExecutor, options: WorkflowRunOptions = {}): Promise<WorkflowRunResult> {
    const ordered = this.validate();
    if (!options.allowPaid) throw new Error('Workflow execution can incur charges; pass allowPaid: true explicitly');
    if (!options.confirmSubmit) throw new Error('Provide confirmSubmit callback to authorize every new job');
    const count = options.concurrency ?? 1;
    if (!Number.isSafeInteger(count) || count < 1 || count > 8) throw new TypeError('concurrency must be 1..8');
    const steps: WorkflowRunResult['steps'] = Object.create(null) as WorkflowRunResult['steps'];
    const outcomes = new Map<string, Promise<void>>();
    let active = 0; const waiting: (() => void)[] = [];
    const acquire = async () => { if (active >= count) await new Promise<void>(resolve => waiting.push(resolve)); active++; };
    const release = () => { active--; waiting.shift()?.(); };
    const emit = (event: WorkflowEvent) => { try { options.onEvent?.(event); } catch { /* observer must not hide accepted job */ } };
    for (const node of ordered) {
      if (node.type === 'source') continue;
      outcomes.set(node.id, (async () => {
        const dependency = outcomes.get(node.input.nodeId);
        if (dependency) await dependency;
        if (options.signal?.aborted) throw new Error('Workflow aborted');
        const upstream = ordered.find(n => n.id === node.input.nodeId)!;
        const url = upstream.type === 'source' ? upstream.url : resolveStem(steps[upstream.id]!.outputs, node.input.stem);
        if (options.completed?.[node.id]) {
          const prior = options.completed[node.id]!;
          if (!prior.hash || !Object.keys(prior.outputs).length || Object.values(prior.outputs).some(url => typeof url !== 'string' || !/^https?:\/\//.test(url)))
            throw new Error('Invalid completed step for ' + node.id);
          steps[node.id] = structuredClone(prior); emit({ nodeId: node.id, state: 'done', hash: prior.hash, outputs: prior.outputs });
          return;
        }
        emit({ nodeId: node.id, state: 'queued' });
        await acquire();
        let acceptedHash: string | undefined;
        try {
          if (options.signal?.aborted) throw new Error('Workflow aborted');
          const algorithm = await executor.getAlgorithm(node.algorithmId, { signal: options.signal });
          if (algorithm.audio_widget !== 'single_upload') throw new Error('Pipeline execution requires a single-upload algorithm');
          const prepared = prepareSeparation({ algorithm, input: { url }, fields: node.options });
          const approved = await options.confirmSubmit!(node, url);
          if (!approved) throw new Error('Submission not authorized for ' + node.label);
          emit({ nodeId: node.id, state: 'running' });
          const created = await executor.createSeparation(prepared.input, { signal: options.signal });
          acceptedHash = created.data?.hash;
          if (!acceptedHash) throw new Error('MVSep accepted a job without returning a hash');
          emit({ nodeId: node.id, state: 'running', hash: acceptedHash });
          const finished = await executor.waitForSeparation(acceptedHash, {
            signal: options.signal, ...(options.maxWaitMs !== undefined ? { maxWaitMs: options.maxWaitMs } : {}),
          });
          if (finished.status !== 'done') throw new Error('Job finished with status: ' + finished.status);
          const outputs = separationOutputs(finished);
          steps[node.id] = { hash: acceptedHash, status: finished.status, outputs };
          emit({ nodeId: node.id, state: 'done', hash: acceptedHash, outputs });
        } catch (e) {
          emit({ nodeId: node.id, state: 'failed', ...(acceptedHash ? { hash: acceptedHash } : {}), error: e instanceof Error ? e.message : String(e) });
          throw e;
        } finally { release(); }
      })());
    }
    const settled = await Promise.allSettled([...outcomes.values()]);
    const firstFailure = settled.find((s): s is PromiseRejectedResult => s.status === 'rejected');
    if (firstFailure) throw firstFailure.reason;
    return { steps };
  }
}
export class WorkflowAudio {
  constructor(readonly graph: WorkflowGraph, readonly nodeId: string, readonly stem: string) {}
  pipe<S extends string>(operation: WorkflowOperation<S>): WorkflowOutputs<S> { return operation.pipe(this); }
}
export type WorkflowOutputs<S extends string> = Record<S, WorkflowAudio>;
function outputPorts<S extends string>(graph: WorkflowGraph, nodeId: string, stems: readonly S[]): WorkflowOutputs<S> {
  const result = Object.create(null) as WorkflowOutputs<S>;
  for (const stem of stems) result[stem] = graph.audio(nodeId, stem);
  return result;
}
export class WorkflowOperation<S extends string> {
  constructor(readonly definition: WorkflowModel<S>, readonly options: WorkflowOptionValues = {}) {}
  pipe(input: AudioInput): WorkflowOutputs<S> {
    const parent = typeof input === 'string' ? new WorkflowGraph().source(input) : input;
    return parent.graph.add(parent, this.definition, this.options);
  }
}
export function separate<S extends string>(model: WorkflowModel<S>, options: WorkflowOptionValues = {}): WorkflowOperation<S> {
  if (!Number.isSafeInteger(model.id) || model.id < 0) throw new TypeError('Invalid model ID');
  return new WorkflowOperation(model, options);
}
export function modelFromAlgorithm(algorithm: SeparationAlgorithm, stems: readonly string[]): WorkflowModel<string> {
  return model(algorithm.render_id, algorithm.name, stems);
}
