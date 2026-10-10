---
title: Audio workflows and graphs
sidebar:
  order: 2
description: Compose typed audio-stem DAGs with separate().pipe(), inspect the resulting graph, and execute paid MVSep jobs with explicit safeguards.
---

Compose multiple separations as a **directed acyclic graph** (DAG). Every intermediate value represents a named stem, not a downloaded byte buffer. An audio output becomes the input of a later separation without requiring the user to fetch and upload it manually, **provided the MVSep output URL can be fetched by the upstream separation service**.

Explore the [interactive workflow composer](/playground/) in the Playground's **Workflows** tab. It uses **React Flow** for drag-to-connect named audio-stem ports, draggable nodes, pan/zoom, a minimap, fit-to-view, automatic layout, live model/option selectors, generated TypeScript, JSON import/export (including node positions), and explicitly approved job execution. Start a connection at an output handle on the right and drop it onto a model input handle on the left; invalid connections and dependency cycles are rejected. Model settings are in the right-hand inspector. Graph editing never submits paid jobs.

## Fluent syntax

```ts
import { Models, separate } from '@rikhoffbauer/mvsep-client/workflow';

const songAudio = 'https://example.com/song.wav';

// The first .pipe(audio) creates a source node and a separation node.
const { drums, vocals, other, bass } = separate(
  Models.Demucs4_HT,
  { 'Model type': 'htdemucs (Good Quality, Fast)' },
).pipe(songAudio);

// These branches both depend on the four-stem Demucs job.
const { hh, crash, ride, kick, cymbals, crash_ride, toms, snare } =
  drums.pipe(separate(Models.DrumSep, { add_opt2: 1 }));

const { synth, other: synth_rest } =
  other.pipe(separate(Models.MVSep_Synth));

const graph = drums.graph;
console.log(graph.document);
console.log(graph.validate().map(node => node.label));
```

`separate(Models.MVSep_Synth, options)` **without** `.pipe(audioInput)` is an unattached operation; it doesn't create a runnable node or stem outputs. To create an independent branch from the original track, call `.pipe(songAudio)` (a new graph), or create a single shared `WorkflowGraph` and connect multiple models to the same source:

```ts
import { WorkflowGraph, Models, separate } from '@rikhoffbauer/mvsep-client/workflow';

const graph = new WorkflowGraph();
const source = graph.source(songAudio, 'Song');
const { drums, vocals } = source.pipe(separate(Models.Demucs4_HT));
const { synth } = source.pipe(separate(Models.MVSep_Synth));
const { kick, snare } = drums.pipe(separate(Models.DrumSep));
```

### Common model identities

| Built-in | MVSep `render_id` | Expected named ports |
| --- | --- | --- |
| `Models.Demucs4_HT` | 20 | vocals, drums, bass, other |
| `Models.DrumSep` | 37 | kick, snare, cymbals, toms, hh, ride, crash and possible variants |
| `Models.MVSep_Synth` | 88 | synth, other |

These ports are **hints**, not guarantees about a particular option configuration. For example, some DrumSep modes produce four stems, others more. The SDK never substitutes the first returned file for a requested stem. It matches actual output filenames by name and fails if a requested stem is absent or ambiguous.

## Configure algorithm-specific options

Options are passed as a dictionary: use API field names (`add_opt1`, `add_opt2`, `add_opt3`) **or the display labels** from MVSep's current algorithm metadata.

```ts
const settings = {
  'Model type': 'htdemucs (Good Quality, Fast)',
};
const { vocals } = separate(Models.Demucs4_HT, settings).pipe(songAudio);
```

At execution, the SDK calls `getAlgorithm(id)` and runs `prepareSeparation()` to resolve labels into correct MVSep option keys. Unknown fields, invalid values, or incompatible algorithm inputs are rejected **before the paid POST**. Prefer the Playground's live option selectors to avoid guessing option values.

For dynamically discovered models, use `modelFromAlgorithm()` with **explicit stem port hints**:

```ts
import { MvsepClient } from '@rikhoffbauer/mvsep-client';
import { modelFromAlgorithm, separate } from '@rikhoffbauer/mvsep-client/workflow';

const client = new MvsepClient({ apiKeys: process.env.MVSEP_API_KEY });
const algorithm = await client.getAlgorithm(20);
const custom = modelFromAlgorithm(algorithm, ['vocals', 'drums', 'bass', 'other']);
const { drums } = separate(custom, { add_opt1: '1' }).pipe(songAudio);
```

## Execute a graph

Building a graph is free. Calling `run()` executes the jobs. **Both** `allowPaid: true` and a `confirmSubmit` callback are required to avoid accidental spending:

```ts
const result = await graph.run(client, {
  allowPaid: true,
  concurrency: 1,
  confirmSubmit: async (node, resolvedAudioUrl) => {
    // Replace with your application's explicit per-job authorization.
    console.log('About to submit:', node.label, resolvedAudioUrl);
    return await askUserForApproval(node);
  },
  onEvent(event) {
    console.log(event.nodeId, event.state, event.hash ?? '');
  },
});

console.log(result.steps);
```

The executor waits for each parent job before starting children. Independent branches may run concurrently if `concurrency` is greater than one; the default is **1**. Each dependency receives the resolved URL of the requested upstream stem. An ambiguous/missing output stops that downstream branch; it does not guess. A locally aborted wait does **not** cancel any remote MVSep job already accepted.

:::caution[Credits and uncertain submissions]
Every model node represents a distinct potentially billable separation request, even when it receives the output of a preceding node. The SDK cannot determine exact pricing from a graph alone, and safe create retry rules remain in effect. Don't automatically resubmit a job if its previous POST may have succeeded without returning a hash.
:::

## Save, edit, and resume

```ts
const serialized = JSON.stringify(graph.document);
const restored = WorkflowGraph.from(JSON.parse(serialized));
restored.validate(); // rejects missing references, cycles or invalid ports

// Only provide completed results from jobs whose identity you have verified.
const continued = await restored.run(client, {
  allowPaid: true,
  confirmSubmit: askUserForApproval,
  completed: previousRun.steps, // reuse recorded completed nodes
});
```

The visual editor can import both a workflow document and a `{ graph, steps }` checkpoint export. Always verify the origin and integrity of imported job hashes and URLs before resuming.

The document is versioned (`version: 1`) and contains sources, models, options, and directed stem connections. **No API keys are stored in it**. Each completed step records its hash and resolved stem URLs for optional later use. Those URLs can expire or be access-controlled; verify them before resuming. In a multi-key workflow, a job may be bound to the account that created it. For robust cross-restart recovery use stable account IDs and persisted handles as described in [API key rotation](/guides/api-key-rotation/).

See the [offline runnable workflow example](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/workflow.ts), which tests the entire graph without submitting paid jobs.

For the full current catalog of all published model IDs and named outputs, see [Supported models and output stems](/reference/models/). Most model output names are option-dependent hints rather than guaranteed files. Refresh the generated TypeScript catalog with `bun run models:update`.

## Explicit exports, local uploads, and FFmpeg audio processing

Terminal Output nodes select exactly which audio artifacts the workflow returns. Two models
may produce the same stem name: the selected output records the **upstream node ID and stem**,
not just the stem label. Intermediate stems are not automatically exported.

```ts
import { WorkflowGraph, Models } from '@rikhoffbauer/mvsep-client/workflow';

const graph = new WorkflowGraph();
const audio = graph.sourceFile('my-song.wav');
const { vocals, other } = graph.add(audio, Models.Demucs4_HT);
const quieter = graph.process({ type: 'gain', decibels: -3 }, [vocals], 'Quiet vocals');
graph.output(quieter, 'Final vocals');
graph.output(other, 'Instrumental');

const results = await graph.run(client, {
  allowPaid: true,
  confirmSubmit: async () => confirm('Approve this MVSep separation?'),
  // File bytes are intentionally not serialized in graph.document or exported JSON.
  files: { [audio.nodeId]: { data: selectedFile, filename: 'my-song.wav' } },
});
console.log(results.exports); // only Final vocals and Instrumental
```

The Playground adds local audio with **Upload audio**, followed by model, FFmpeg effect,
and Output nodes. You can also start with an HTTPS audio URL. Uploads are submitted to
MVSep only after the corresponding paid-job confirmation; FFmpeg-only graphs require no
MVSep credentials. Imported JSON graphs refer to a file by name, so you must **reattach the
file** before executing them. Downloaded/processed audio is held in memory and can use
substantial browser RAM.

Supported FFmpeg effects include mixing multiple streams, subtracting an aligned stream
(using negative mixing weight, i.e. inverted phase), phase inversion, gain, low/high-pass,
and trimming. Subtraction requires both inputs to be time-aligned; it does not perform
alignment automatically. Browser execution uses the single-thread `ffmpeg.wasm` core,
which is downloaded at first use. On Node.js the same workflow uses the installed native
`ffmpeg` executable. Remote audio URLs must be CORS-accessible for browser-side FFmpeg
processing, or processed from a local file instead.

## Automatic model selection

```ts
import { selectModels, rankModels } from '@rikhoffbauer/mvsep-client/workflow';

const plan = selectModels('best[vocals+drums]');
const alternatives = rankModels('cheapest[vocals+kick]');
const forced = selectModels('best[piano+guitar]@20');
```

`best[...]` uses available **community vote metadata**, not a validated objective audio-quality
benchmark. `cheapest[...]` compares public model price coefficients, not actual credit
quotes; `fewest[...]` prioritizes fewer jobs. The selector can suggest up to two MVSep
steps, includes required model options where output names vary, and explains which step
supplies each requested stem. It never submits a job or bypasses paid-operation approval.
The playground creates separate Output nodes for every requested stem when applying a plan.

See [the generated model catalog](/reference/models/) for all current model names, categories,
IDs, option profiles, and published output port hints.
