import { getOutputFiles, prepareSeparation } from './metadata.js';
function model(id, name, stems) {
    return Object.freeze({ id, name, stems: Object.freeze([...stems]) });
}
/** Known port hints, not promises: actual stem names can change with upstream model options. */
export const Models = Object.freeze({
    Demucs4_HT: model(20, 'Demucs4 HT', ['drums', 'vocals', 'other', 'bass']),
    DrumSep: model(37, 'DrumSep', ['hh', 'hihat', 'crash', 'ride', 'kick', 'cymbals', 'crash_ride', 'toms', 'snare']),
    MVSep_Synth: model(88, 'MVSep Synth', ['synth', 'other']),
});
function assertId(id) { if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id))
    throw new TypeError('Invalid node ID: ' + id); }
function normalizeStem(name) {
    return name.toLowerCase().replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/\b(hihat|hi hat|hi-hat)\b/g, 'hh')
        .replace(/\b(instrumental|instrum)\b/g, 'other')
        .replace(/[^a-z0-9]+/g, ' ').trim();
}
/** A strict resolver: never guess based on result ordering. */
export function resolveStem(available, requested) {
    if (available[requested])
        return available[requested];
    const needle = normalizeStem(requested);
    const matches = Object.entries(available).filter(([name]) => {
        const normalized = normalizeStem(name);
        return normalized === needle || normalized.split(/\s+/).includes(needle);
    });
    if (matches.length !== 1)
        throw new Error(`Cannot resolve stem "${requested}" (${matches.length} matches). Available: ${Object.keys(available).join(', ') || 'none'}`);
    return matches[0][1];
}
/** Converts upstream response file labels to a strictly validated lookup. */
export function separationOutputs(result) {
    const outputs = Object.create(null);
    for (const file of getOutputFiles(result)) {
        if (Object.hasOwn(outputs, file.name))
            throw new Error('Duplicate output name: ' + file.name);
        outputs[file.name] = file.url;
    }
    if (!Object.keys(outputs).length)
        throw new Error('Completed separation produced no downloadable outputs');
    return outputs;
}
export class WorkflowGraph {
    nodes = [];
    nextId = 1;
    constructor(document) { if (document)
        this.load(document); }
    get document() { return { version: 1, nodes: structuredClone(this.nodes) }; }
    get allNodes() { return this.document.nodes; }
    source(url, label = 'Audio') {
        if (!/^https:\/\/[^\s/]+/i.test(url))
            throw new TypeError('Audio source must be a publicly reachable HTTPS URL');
        const id = this.id();
        this.nodes.push({ id, type: 'source', label, url });
        return new WorkflowAudio(this, id, 'source');
    }
    /** Add a model node with an already defined audio input. */
    add(input, definition, options = {}) {
        if (input.graph !== this)
            throw new TypeError('Cannot connect different workflow graphs');
        const node = {
            id: this.id(), type: 'separate', label: definition.name, algorithmId: definition.id,
            options: { ...options }, input: { nodeId: input.nodeId, stem: input.stem }, stems: [...definition.stems],
        };
        this.nodes.push(node);
        return outputPorts(this, node.id, definition.stems);
    }
    addNode(input, modelId, label, stems, options = {}) {
        return this.add(input, model(modelId, label, stems), options);
    }
    /** Replace a graph from a JSON document; reject invalid dependencies and cycles. */
    load(document) {
        if (!document || document.version !== 1 || !Array.isArray(document.nodes))
            throw new TypeError('Invalid workflow document version');
        const nodes = structuredClone(document.nodes);
        if (nodes.length > 100)
            throw new TypeError('Maximum 100 workflow nodes');
        for (const node of nodes) {
            if (!node || typeof node !== 'object')
                throw new TypeError('Invalid graph node');
            assertId(node.id);
            if (typeof node.label !== 'string')
                throw new TypeError('Invalid node label');
            if (node.type === 'source') {
                if (typeof node.url !== 'string' || !/^https:\/\/[^\s/]+/i.test(node.url))
                    throw new TypeError('Invalid audio source URL');
            }
            else if (node.type === 'separate') {
                if (!Number.isSafeInteger(node.algorithmId) || node.algorithmId < 0 || !node.input ||
                    typeof node.input.nodeId !== 'string' || typeof node.input.stem !== 'string' ||
                    !Array.isArray(node.stems) || node.stems.some(stem => typeof stem !== 'string') ||
                    !node.options || typeof node.options !== 'object' || Array.isArray(node.options) ||
                    Object.values(node.options).some(value => typeof value !== 'string' && typeof value !== 'number') ||
                    Object.keys(node.options).some(key => !/^[a-zA-Z0-9_ ]{1,80}$/.test(key)))
                    throw new TypeError('Invalid separation node');
            }
            else
                throw new TypeError('Unknown node type');
        }
        this.nodes = nodes;
        this.validate();
        this.nextId = Math.max(1, ...nodes.map(n => Number(n.id.replace(/^n/, '')) || 0)) + 1;
    }
    static from(document) { return new WorkflowGraph(document); }
    id() { while (this.nodes.some(n => n.id === 'n' + this.nextId))
        this.nextId++; return 'n' + this.nextId++; }
    audio(nodeId, stem = 'source') {
        if (!this.nodes.some(n => n.id === nodeId))
            throw new TypeError('Unknown workflow node: ' + nodeId);
        return new WorkflowAudio(this, nodeId, stem);
    }
    validate() {
        const ids = new Map();
        for (const node of this.nodes) {
            if (ids.has(node.id))
                throw new TypeError('Duplicate workflow node ID: ' + node.id);
            ids.set(node.id, node);
        }
        const visiting = new Set();
        const complete = new Set();
        const order = [];
        const visit = (id) => {
            if (visiting.has(id))
                throw new TypeError('Workflow contains a dependency cycle');
            if (complete.has(id))
                return;
            const node = ids.get(id);
            if (!node)
                throw new TypeError('Unknown dependency: ' + id);
            visiting.add(id);
            if (node.type === 'separate') {
                const parent = ids.get(node.input.nodeId);
                if (!parent)
                    throw new TypeError('Missing upstream node: ' + node.input.nodeId);
                if (parent.type === 'source' && node.input.stem !== 'source')
                    throw new TypeError('Audio source exposes only the "source" output');
                if (parent.type === 'separate' && !parent.stems.includes(node.input.stem))
                    throw new TypeError(`Upstream model does not declare output "${node.input.stem}"`);
                visit(parent.id);
            }
            visiting.delete(id);
            complete.add(id);
            order.push(node);
        };
        for (const node of this.nodes)
            visit(node.id);
        return order;
    }
    async run(executor, options = {}) {
        const ordered = this.validate();
        if (!options.allowPaid)
            throw new Error('Workflow execution can incur charges; pass allowPaid: true explicitly');
        if (!options.confirmSubmit)
            throw new Error('Provide confirmSubmit callback to authorize every new job');
        const count = options.concurrency ?? 1;
        if (!Number.isSafeInteger(count) || count < 1 || count > 8)
            throw new TypeError('concurrency must be 1..8');
        const steps = Object.create(null);
        const outcomes = new Map();
        let active = 0;
        const waiting = [];
        const acquire = async () => { if (active >= count)
            await new Promise(resolve => waiting.push(resolve)); active++; };
        const release = () => { active--; waiting.shift()?.(); };
        const emit = (event) => { try {
            options.onEvent?.(event);
        }
        catch { /* observer must not hide accepted job */ } };
        for (const node of ordered) {
            if (node.type === 'source')
                continue;
            outcomes.set(node.id, (async () => {
                const dependency = outcomes.get(node.input.nodeId);
                if (dependency)
                    await dependency;
                if (options.signal?.aborted)
                    throw new Error('Workflow aborted');
                const upstream = ordered.find(n => n.id === node.input.nodeId);
                const url = upstream.type === 'source' ? upstream.url : resolveStem(steps[upstream.id].outputs, node.input.stem);
                if (options.completed?.[node.id]) {
                    const prior = options.completed[node.id];
                    if (!prior.hash || !Object.keys(prior.outputs).length || Object.values(prior.outputs).some(url => typeof url !== 'string' || !/^https?:\/\//.test(url)))
                        throw new Error('Invalid completed step for ' + node.id);
                    steps[node.id] = structuredClone(prior);
                    emit({ nodeId: node.id, state: 'done', hash: prior.hash, outputs: prior.outputs });
                    return;
                }
                emit({ nodeId: node.id, state: 'queued' });
                await acquire();
                let acceptedHash;
                try {
                    if (options.signal?.aborted)
                        throw new Error('Workflow aborted');
                    const algorithm = await executor.getAlgorithm(node.algorithmId, { signal: options.signal });
                    if (algorithm.audio_widget !== 'single_upload')
                        throw new Error('Pipeline execution requires a single-upload algorithm');
                    const prepared = prepareSeparation({ algorithm, input: { url }, fields: node.options });
                    const approved = await options.confirmSubmit(node, url);
                    if (!approved)
                        throw new Error('Submission not authorized for ' + node.label);
                    emit({ nodeId: node.id, state: 'running' });
                    const created = await executor.createSeparation(prepared.input, { signal: options.signal });
                    acceptedHash = created.data?.hash;
                    if (!acceptedHash)
                        throw new Error('MVSep accepted a job without returning a hash');
                    emit({ nodeId: node.id, state: 'running', hash: acceptedHash });
                    const finished = await executor.waitForSeparation(acceptedHash, {
                        signal: options.signal, ...(options.maxWaitMs !== undefined ? { maxWaitMs: options.maxWaitMs } : {}),
                    });
                    if (finished.status !== 'done')
                        throw new Error('Job finished with status: ' + finished.status);
                    const outputs = separationOutputs(finished);
                    steps[node.id] = { hash: acceptedHash, status: finished.status, outputs };
                    emit({ nodeId: node.id, state: 'done', hash: acceptedHash, outputs });
                }
                catch (e) {
                    emit({ nodeId: node.id, state: 'failed', ...(acceptedHash ? { hash: acceptedHash } : {}), error: e instanceof Error ? e.message : String(e) });
                    throw e;
                }
                finally {
                    release();
                }
            })());
        }
        const settled = await Promise.allSettled([...outcomes.values()]);
        const firstFailure = settled.find((s) => s.status === 'rejected');
        if (firstFailure)
            throw firstFailure.reason;
        return { steps };
    }
}
export class WorkflowAudio {
    graph;
    nodeId;
    stem;
    constructor(graph, nodeId, stem) {
        this.graph = graph;
        this.nodeId = nodeId;
        this.stem = stem;
    }
    pipe(operation) { return operation.pipe(this); }
}
function outputPorts(graph, nodeId, stems) {
    const result = Object.create(null);
    for (const stem of stems)
        result[stem] = graph.audio(nodeId, stem);
    return result;
}
export class WorkflowOperation {
    definition;
    options;
    constructor(definition, options = {}) {
        this.definition = definition;
        this.options = options;
    }
    pipe(input) {
        const parent = typeof input === 'string' ? new WorkflowGraph().source(input) : input;
        return parent.graph.add(parent, this.definition, this.options);
    }
}
export function separate(model, options = {}) {
    if (!Number.isSafeInteger(model.id) || model.id < 0)
        throw new TypeError('Invalid model ID');
    return new WorkflowOperation(model, options);
}
export function modelFromAlgorithm(algorithm, stems) {
    return model(algorithm.render_id, algorithm.name, stems);
}
//# sourceMappingURL=workflow.js.map