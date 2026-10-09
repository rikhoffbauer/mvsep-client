import test from 'node:test';
import assert from 'node:assert/strict';
import { Models, WorkflowGraph, separate, resolveStem, separationOutputs } from '../dist/workflow.js';

const song = 'https://example.com/song.wav';
const fakeAlgorithm = id => ({ render_id: id, name: 'mock-'+id, audio_widget: 'single_upload', algorithm_fields: id===20 ? [
  { name:'add_opt1', text: 'Model type', options: '{"0":"Fine","1":"Fast"}', default_key:'1' }
] : [] });

test('fluent composition matches destructuring/pipe example and yields a valid DAG', () => {
  const { drums, vocals, bass, other } = separate(Models.Demucs4_HT, { 'Model type': 'Fast' }).pipe(song);
  const { hh, kick, snare } = drums.pipe(separate(Models.DrumSep));
  const { synth, other: synth_rest } = other.pipe(separate(Models.MVSep_Synth));
  assert.equal(hh.stem, 'hh'); assert.equal(kick.graph, drums.graph); assert.equal(snare.graph, drums.graph);
  assert.equal(synth.graph, drums.graph); assert.equal(synth_rest.stem, 'other');
  const document = drums.graph.document;
  assert.equal(document.nodes.length, 4); // source and three models
  assert.deepEqual(document.nodes.filter(node=>node.type==='separate').map(node=>node.algorithmId), [20,37,88]);
  assert.deepEqual(drums.graph.validate().map(node=>node.id), document.nodes.map(node=>node.id));
  assert.equal(vocals.nodeId, drums.nodeId); assert.equal(bass.nodeId, drums.nodeId);
});

test('import/export graph does not expose its mutable original, rejects missing edges & cycles', () => {
  const root = new WorkflowGraph(); const first = root.source(song);
  const { drums } = first.pipe(separate(Models.Demucs4_HT));
  const { hh } = drums.pipe(separate(Models.DrumSep));
  const doc = root.document; const clone = WorkflowGraph.from(doc);
  doc.nodes[0].label = 'changed externally';
  assert.equal(clone.allNodes[0].label, 'Audio');
  const bad = clone.document;
  const modelNode = bad.nodes.find(n=>n.type==='separate'&&n.algorithmId===20);
  modelNode.input.nodeId = hh.nodeId; modelNode.input.stem = 'hh';
  assert.throws(()=>new WorkflowGraph(bad), /cycle/);
  const missing=clone.document; missing.nodes[1].input.nodeId='absent';
  assert.throws(()=>new WorkflowGraph(missing), /Missing upstream/);
});

test('strict stem matching refuses missing/ambiguous outputs and checks result labels', () => {
  const files = { 'Vocals.wav':'https://example.com/v', 'Drums (clean).flac':'https://example.com/d' };
  assert.equal(resolveStem(files,'vocals'), 'https://example.com/v');
  assert.equal(resolveStem(files,'drums'), 'https://example.com/d');
  assert.throws(()=>resolveStem(files,'kick'), /Cannot resolve/);
  assert.throws(()=>resolveStem({ 'drums.wav':'a','Drums.flac':'b' },'drums'), /2 matches/);
  assert.deepEqual({ ...separationOutputs({success:true,status:'done',data:{files:[{name:'vocals.wav',url:'https://x/v'}]}}) }, { 'vocals.wav':'https://x/v' });
  assert.throws(()=>separationOutputs({success:true,status:'done',data:{files:[]}}), /no downloadable/);
});

test('graph runner enforces opt-in before any remote calls, validates option labels, follows stem URLs', async () => {
  const {drums}=separate(Models.Demucs4_HT, { 'Model type':'Fast' }).pipe(song);
  drums.pipe(separate(Models.DrumSep));
  const graph=drums.graph;
  const requests=[]; const events=[];
  const fake={
    async getAlgorithm(id) { requests.push(['alg',id]); return fakeAlgorithm(id); },
    async createSeparation(input) { requests.push(['create',input]); return {data:{hash:'job-'+requests.filter(x=>x[0]==='create').length}}; },
    async waitForSeparation(hash) { requests.push(['wait',hash]); return {success:true,status:'done',data:{ files:hash==='job-1'
      ? [{name:'Vocals.wav',url:'https://example.com/v'}, {name:'Drums.wav',url:'https://example.com/drums.wav'}]
      : [{name:'hh.wav',url:'https://example.com/hh'}, {name:'kick.wav',url:'https://example.com/kick'}]}}; },
  };
  await assert.rejects(graph.run(fake),/allowPaid/);
  await assert.rejects(graph.run(fake,{allowPaid:true}),/confirmSubmit/);
  assert.equal(requests.length,0);
  const result=await graph.run(fake,{allowPaid:true,confirmSubmit:()=>true,onEvent:e=>events.push(e)});
  const creates=requests.filter(x=>x[0]==='create').map(x=>x[1]);
  assert.equal(creates.length,2);
  assert.equal(creates[0].url,song); assert.equal(creates[0].addOpt1,'1');
  assert.equal(creates[1].url,'https://example.com/drums.wav');
  assert.equal(Object.keys(result.steps).length,2);
  assert.equal(events.filter(e=>e.state==='done').length,2);
});

test('disabled permission, invalid options and missing requested stems never submit downstream jobs', async () => {
  const {drums}=separate(Models.Demucs4_HT).pipe(song);
  drums.pipe(separate(Models.DrumSep));
  let creates=0;
  const fake={
    async getAlgorithm(id){return fakeAlgorithm(id)},
    async createSeparation(){creates++;return {data:{hash:'job-'+creates}}},
    async waitForSeparation(){return {success:true,status:'done',data:{files:[{name:'vocals.wav',url:'https://example.com/v'}]}}},
  };
  await assert.rejects(drums.graph.run(fake,{allowPaid:true,confirmSubmit:()=>false}),/not authorized/);
  assert.equal(creates,0);
  await assert.rejects(drums.graph.run(fake,{allowPaid:true,confirmSubmit:()=>true}),/Cannot resolve stem "drums"/);
  assert.equal(creates,1);
});

test('resume completed job with recorded outputs does not resubmit upstream', async () => {
  const {drums}=separate(Models.Demucs4_HT).pipe(song);
  const {snare}=drums.pipe(separate(Models.DrumSep));
  const upstream=drums.nodeId;
  const calls=[];
  const fake={
    async getAlgorithm(id){return fakeAlgorithm(id)},
    async createSeparation(input){calls.push(input);return {data:{hash:'new'}}},
    async waitForSeparation(){return {success:true,status:'done',data:{files:[{name:'snare.wav',url:'https://example.com/s'}]}}},
  };
  const completed={ [upstream]:{hash:'old',status:'done',outputs:{'drums.wav':'https://example.com/d'}} };
  const out=await snare.graph.run(fake,{allowPaid:true,confirmSubmit:()=>true,completed});
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://example.com/d');
  assert.equal(out.steps[upstream].hash,'old');
});
