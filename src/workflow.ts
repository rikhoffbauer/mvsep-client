/**
 * Browser/Node-compatible DAG composition for chained MVSep separations.
 * Graph construction makes no remote calls. Execution requires explicit invocation.
 */
import type { CallOptions, PollOptions, BinaryPart, CreateSeparationInput, SeparationAlgorithm, SeparationResult } from './types.js';
import { getOutputFiles, prepareSeparation } from './metadata.js';
import { generatedModels } from './models.generated.js';
import { stemsForModel } from './model-outputs.js';
import { createAudioProcessor, ffmpegArgs } from './audio-processing.js';
import type { AudioEffect, AudioProcessor } from './audio-processing.js';
export { modelFromAlgorithm } from './algorithm-model.js';
export { stemsForModel } from './model-outputs.js';
export { parseModelSelector, rankModels, selectModels } from './model-selector.js';
export type { ModelSelectionPreference, ModelSelectionRequest, ModelSelectionPlan, ModelSelectionStep } from './model-selector.js';

export type AudioInput = string | WorkflowAudio;
export type WorkflowOptionValues = Record<string, string | number>;
export type WorkflowModel<Stems extends string = string> = Readonly<{
  id: number; name: string; stems: readonly Stems[];
  fields?: readonly { name: string; text?: string; serverKey?: string; defaultKey?: string; choices?: unknown }[];
  profiles?: readonly { match: Readonly<Record<string, string>>; stems: readonly string[] }[];
  active?: boolean; widget?: string; group?: string; groupId?: number;
  priceCoefficient?: number; rating?: Readonly<{average:number; total:number}>;
}>;
function model<S extends string>(id: number, name: string, stems: readonly S[]): WorkflowModel<S> {
  return Object.freeze({ id, name, stems: Object.freeze([...stems]) });
}
/** Generated model catalog; refresh with bun run models:update. */
export const Models = Object.freeze(generatedModels);
export interface WorkflowSourceNode { id: string; type: 'source'; label: string; url: string; fileName?: string }
export interface WorkflowSeparationNode {
  id: string; type: 'separate'; label: string; algorithmId: number;
  /** Only declared MVSep fields: add_opt1..add_opt3, or their displayed names. */
  options: WorkflowOptionValues;
  input: { nodeId: string; stem: string };
  /** Hints for available outputs. Runtime verifies their actual names. */
  stems: string[];
}
export interface WorkflowOutputNode {
  id: string; type: 'output'; label: string; input: { nodeId: string; stem: string };
}
export interface WorkflowProcessNode {
  id: string; type: 'process'; label: string; effect: AudioEffect;
  inputs: { nodeId: string; stem: string }[];
  stems: ['audio'];
}
export type WorkflowNode = WorkflowSourceNode | WorkflowSeparationNode | WorkflowOutputNode | WorkflowProcessNode;
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
export interface WorkflowExport {
  from: { nodeId: string; stem: string };
  /** Remote URL if the selected stem is hosted by MVSep or is the original URL. */
  url?: string;
  /** Local WAV bytes when the selected output comes from FFmpeg or a local upload. */
  data?: Uint8Array;
}
export interface WorkflowRunResult {
  steps: Record<string, { hash: string; status: string; outputs: Record<string, string> }>;
  /** Only explicitly connected Output nodes appear here. */
  exports?: Record<string, WorkflowExport>;
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
  /** Browser File or Node Blob for local source nodes. Data is never serialized in graph JSON. */
  files?: Record<string, BinaryPart>;
  /** Optional preconfigured FFmpeg implementation (native or WASM). */
  audioProcessor?: AudioProcessor;
  /** Fetch remote audio for processing; override for proxies or controlled servers. */
  fetchAudio?: (url: string, signal?: AbortSignal) => Promise<Uint8Array>;
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
  /** File bytes are supplied separately to run(files), never embedded in JSON. */
  sourceFile(fileName: string, label = 'Audio file'): WorkflowAudio {
    if (!fileName.trim() || fileName.length > 200 || /[\x00-\x1f/\\]/.test(fileName))
      throw new TypeError('Invalid local audio filename');
    const id = this.id();
    this.nodes.push({ id, type: 'source', label, url: '', fileName });
    return new WorkflowAudio(this, id, 'source');
  }
  /** Explicitly select a single final audio artifact. Only connected exports are returned. */
  output(input: WorkflowAudio, label: string): string {
    if (input.graph !== this || !label.trim()) throw new TypeError('Invalid output selection');
    if (this.nodes.some(node => node.type === 'output' && node.label === label))
      throw new TypeError('Final Output node labels must be unique');
    const id = this.id();
    this.nodes.push({ id, type: 'output', label, input: { nodeId: input.nodeId, stem: input.stem } });
    try { this.validate(); } catch (error) { this.nodes.pop(); throw error; }
    return id;
  }
  /** Create an audio filter node that executes with WASM or native FFmpeg. */
  process(effect: AudioEffect, inputs: readonly WorkflowAudio[], label = 'FFmpeg audio'): WorkflowAudio {
    if (inputs.some(input => input.graph !== this)) throw new TypeError('Cannot connect different workflow graphs');
    // Shared argument construction also checks effect parameters and input arity.
    ffmpegArgs(effect, inputs.map((_, i) => 'input-' + i + '.wav'), 'output.wav');
    const id = this.id();
    this.nodes.push({ id, type: 'process', label, effect: structuredClone(effect),
      inputs: inputs.map(input => ({ nodeId: input.nodeId, stem: input.stem })), stems: ['audio'] });
    try { this.validate(); } catch (error) { this.nodes.pop(); throw error; }
    return new WorkflowAudio(this, id, 'audio');
  }
  /** Add a model node with an already defined audio input. */
  add<S extends string>(input: WorkflowAudio, definition: WorkflowModel<S>, options: WorkflowOptionValues = {}): WorkflowOutputs<S> {
    if (input.graph !== this) throw new TypeError('Cannot connect different workflow graphs');
    const node: WorkflowSeparationNode = {
      id: this.id(), type: 'separate', label: definition.name, algorithmId: definition.id,
      options: { ...options }, input: { nodeId: input.nodeId, stem: input.stem }, stems: [...stemsForModel(definition, options)],
    };
    this.nodes.push(node);
    return outputPorts(this, node.id, node.stems as S[], definition.stems);
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
        if (typeof node.url !== 'string' ||
          (node.fileName ? node.url !== '' || !node.fileName.trim() || node.fileName.length > 200 ||
            /[\x00-\x1f/\\]/.test(node.fileName) : !/^https:\/\/[^\s/]+/i.test(node.url)))
          throw new TypeError('Invalid audio source URL or file name');
      } else if (node.type === 'separate') {
        if (!Number.isSafeInteger(node.algorithmId) || node.algorithmId < 0 || !node.input ||
            typeof node.input.nodeId !== 'string' || typeof node.input.stem !== 'string' ||
            !Array.isArray(node.stems) || node.stems.some(stem => typeof stem !== 'string') ||
            !node.options || typeof node.options !== 'object' || Array.isArray(node.options) ||
            Object.values(node.options).some(value => typeof value !== 'string' && typeof value !== 'number') ||
            Object.keys(node.options).some(key => !/^[a-zA-Z0-9_ ]{1,80}$/.test(key)))
          throw new TypeError('Invalid separation node');
      } else if (node.type === 'output') {
        if (!node.input || typeof node.input.nodeId !== 'string' || typeof node.input.stem !== 'string' || !node.label.trim())
          throw new TypeError('Invalid output node');
      } else if (node.type === 'process') {
        if (!Array.isArray(node.inputs) || !Array.isArray(node.stems) || node.stems.length !== 1 ||
            node.stems[0] !== 'audio' || !node.effect || typeof node.effect !== 'object' ||
            node.inputs.some(input => !input || typeof input.nodeId !== 'string' || typeof input.stem !== 'string'))
          throw new TypeError('Invalid FFmpeg processing node');
        ffmpegArgs(node.effect, node.inputs.map((_,i)=>'input-'+i+'.wav'), 'output.wav');
      } else throw new TypeError('Unknown node type');
    }
    const names = nodes.filter(n => n.type === 'output').map(n => n.label);
    if (new Set(names).size !== names.length) throw new TypeError('Final Output node labels must be unique');
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
      const parents = node.type === 'separate' || node.type === 'output' ? [node.input] :
        node.type === 'process' ? node.inputs : [];
      for (const input of parents) {
        const parent = ids.get(input.nodeId);
        if (!parent) throw new TypeError('Missing upstream node: ' + input.nodeId);
        if (parent.type === 'source' && input.stem !== 'source')
          throw new TypeError('Audio source exposes only the "source" output');
        if ((parent.type === 'separate' || parent.type === 'process') && !parent.stems.some(stem => stem === input.stem))
          throw new TypeError('Upstream node does not declare output "' + input.stem + '"');
        if (parent.type === 'output') throw new TypeError('Output nodes cannot feed downstream audio');
        visit(parent.id);
      }
      visiting.delete(id); complete.add(id); order.push(node);
    };
    for (const node of this.nodes) visit(node.id);
    return order;
  }
  async run(executor: WorkflowExecutor, options: WorkflowRunOptions = {}): Promise<WorkflowRunResult> {
    const ordered = this.validate();
    if (ordered.some(node=>node.type === 'separate')) {
      if (!options.allowPaid) throw new Error('Workflow execution can incur charges; pass allowPaid: true explicitly');
      if (!options.confirmSubmit) throw new Error('Provide confirmSubmit callback to authorize every new job');
    }
    const count = options.concurrency ?? 1;
    if (!Number.isSafeInteger(count) || count < 1 || count > 8) throw new TypeError('concurrency must be 1..8');
    const steps: WorkflowRunResult['steps'] = Object.create(null) as WorkflowRunResult['steps'];
    const outcomes = new Map<string, Promise<void>>();
    const localResults = new Map<string, Uint8Array>();
    const selected: Record<string, WorkflowExport> = Object.create(null) as Record<string, WorkflowExport>;
    let processor: AudioProcessor | undefined = options.audioProcessor;
    let ownsProcessor = false;
    let active = 0; const waiting: (() => void)[] = [];
    const acquire = async () => { if (active >= count) await new Promise<void>(resolve => waiting.push(resolve)); active++; };
    const release = () => { active--; waiting.shift()?.(); };
    const emit = (event: WorkflowEvent) => { try { options.onEvent?.(event); } catch { /* observer must not hide accepted job */ } };
    const binary = async (part: BinaryPart): Promise<Uint8Array> => part.data instanceof Blob ?
      new Uint8Array(await part.data.arrayBuffer()) : new Uint8Array(part.data);
    const fetchAudio = options.fetchAudio ?? (async (url: string, signal?: AbortSignal) => {
      const response = await fetch(url, { ...(signal ? { signal } : {}) });
      if (!response.ok) throw new Error('Could not download audio: HTTP ' + response.status);
      return new Uint8Array(await response.arrayBuffer());
    });
    const asset = (input: {nodeId:string;stem:string}): {url?:string;data?:Uint8Array;file?:BinaryPart} => {
      const upstream = ordered.find(n => n.id === input.nodeId);
      if (!upstream) throw new Error('Missing upstream ' + input.nodeId);
      if (upstream.type === 'source') {
        if (upstream.fileName) {
          const part = options.files?.[upstream.id];
          if (!part) throw new Error('Reattach local audio file for ' + upstream.label);
          return { file: part };
        }
        return {url:upstream.url};
      }
      if (upstream.type === 'process') {
        const data = localResults.get(upstream.id);
        if (!data) throw new Error('Missing FFmpeg output ' + upstream.id);
        return {data};
      }
      if (upstream.type === 'separate') {
        const result = steps[upstream.id];
        if (!result) throw new Error('Missing upstream separation result ' + upstream.id);
        return {url:resolveStem(result.outputs,input.stem)};
      }
      throw new Error('Output nodes cannot feed downstream audio');
    };
    for (const node of ordered) {
      if (node.type === 'source') continue;
      outcomes.set(node.id, (async () => {
        const parents = node.type === 'process' ? node.inputs : [node.input];
        await Promise.all(parents.map(input => outcomes.get(input.nodeId)));
        if (options.signal?.aborted) throw new Error('Workflow aborted');
        if (node.type === 'output') {
          const selectedAsset = asset(node.input);
          selected[node.label] = {
            from:{...node.input},
            ...(selectedAsset.url ? {url:selectedAsset.url} : {}),
            ...(selectedAsset.data ? {data:selectedAsset.data} : {}),
            ...(selectedAsset.file ? {data:await binary(selectedAsset.file)} : {}),
          };
          emit({nodeId:node.id,state:'done'});
          return;
        }
        if (node.type === 'process') {
          emit({nodeId:node.id,state:'queued'});
          const files = await Promise.all(node.inputs.map(async input => {
            const item=asset(input);
            const data=item.data ?? (item.file ? await binary(item.file) : await fetchAudio(item.url!,options.signal));
            return {data,extension:item.file?.filename?.split('.').pop() ?? (item.url?.split('?')[0]?.split('.').pop() ?? 'wav')};
          }));
          processor ??= await createAudioProcessor();
          if (!options.audioProcessor) ownsProcessor=true;
          emit({nodeId:node.id,state:'running'});
          try {
            localResults.set(node.id,await processor.process({effect:node.effect,inputs:files,...(options.signal ? {signal:options.signal} : {})}));
            emit({nodeId:node.id,state:'done',outputs:{audio:'local:wav'}});
          } catch (e) {
            emit({nodeId:node.id,state:'failed',error:e instanceof Error?e.message:String(e)});throw e;
          }
          return;
        }
        const upstreamAsset = asset(node.input);
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
          const uploaded = upstreamAsset.file ?? (upstreamAsset.data ?
            { data:upstreamAsset.data, filename:'processed.wav',contentType:'audio/wav' } : undefined);
          const prepared = prepareSeparation({ algorithm, input: uploaded ? { audiofile:uploaded } : { url:upstreamAsset.url! }, fields: node.options });
          const approved = await options.confirmSubmit!(node, upstreamAsset.url ?? '(local audio upload)');
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
    try {
      const settled = await Promise.allSettled([...outcomes.values()]);
      const firstFailure = settled.find((s): s is PromiseRejectedResult => s.status === 'rejected');
      if (firstFailure) throw firstFailure.reason;
      return { steps, ...(Object.keys(selected).length ? { exports: selected } : {}) };
    } finally {
      if (ownsProcessor) await processor?.dispose?.();
    }
  }
}
export class WorkflowAudio {
  constructor(readonly graph: WorkflowGraph, readonly nodeId: string, readonly stem: string) {}
  pipe<S extends string>(operation: WorkflowOperation<S>): WorkflowOutputs<S> { return operation.pipe(this); }
}
export type WorkflowOutputs<S extends string> = Record<S, WorkflowAudio>;
function outputPorts<S extends string>(graph: WorkflowGraph, nodeId: string, stems: readonly S[], declared: readonly S[]): WorkflowOutputs<S> {
  const result = Object.create(null) as WorkflowOutputs<S>;
  for (const stem of stems) result[stem] = graph.audio(nodeId, stem);
  return new Proxy(result, {
    get(target, property, receiver) {
      if (typeof property === 'string' && declared.includes(property as S) && !Object.hasOwn(target, property))
        throw new TypeError('Output stem "' + property + '" is not available for this option configuration; available: ' + stems.join(', '));
      return Reflect.get(target, property, receiver);
    },
  });
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
