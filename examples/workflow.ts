/** Offline graph composition + execution. No API tokens, HTTP, or billable jobs. */
import assert from 'node:assert/strict';
import { Models, separate, WorkflowGraph, type WorkflowExecutor } from '../src/workflow.js';

const songAudio = 'https://example.com/song.wav';
const { drums, vocals, bass, other } = separate(Models.Demucs4_HT, { 'Model type': 'Fast' }).pipe(songAudio);
const { hh, kick, snare, toms, ride, crash, residual } = drums.pipe(separate(Models.DrumSep));
const { synth, other: synth_rest } = other.pipe(separate(Models.MVSep_Synth));
void [vocals, bass, hh, kick, snare, toms, ride, crash, residual, synth, synth_rest];

const graph = WorkflowGraph.from(drums.graph.document);
assert.equal(graph.validate().length, 4);
let submitted = 0;
const executor: WorkflowExecutor = {
  async getAlgorithm(id) {
    return { render_id: id, name: `Mock ${id}`, audio_widget: 'single_upload',
      algorithm_fields: id === 20 ? [{ name: 'add_opt1', text: 'Model type', options: '{"1":"Fast"}' }] : [] };
  },
  async createSeparation(input) {
    submitted++;
    console.log('MOCK create separation', submitted, input.sepType, input.url);
    return { data: { hash: `mock-job-${submitted}` } };
  },
  async waitForSeparation(hash) {
    const files = hash === 'mock-job-1'
      ? [
          { name: 'drums.wav', url: 'https://example.com/drums.wav' },
          { name: 'other.wav', url: 'https://example.com/other.wav' },
        ]
      : [{ name: 'vocals.wav', url: 'https://example.com/mock-out.wav' }];
    return { success: true, status: 'done', data: { hash, files } };
  },
};
// The mock must return named drum/synth outputs for execution to be realistic.
// This example shows structure and explicitly protects against accidental paid jobs.
await assert.rejects(graph.run(executor), /allowPaid/);
assert.equal(submitted, 0);
console.log(JSON.stringify(graph.document, null, 2));
console.log('Validated offline workflow graph; no jobs submitted.');
