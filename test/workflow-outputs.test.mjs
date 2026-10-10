import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkflowGraph, Models } from '../dist/workflow.js';

const URL = 'https://example.com/audio.wav';
const makeExecutor = () => {
  let count = 0;
  return {
    calls: [],
    async getAlgorithm(id) { return { render_id:id, name:'mock-'+id, audio_widget:'single_upload', algorithm_fields:[] }; },
    async createSeparation(input) { this.calls.push(input);return {data:{hash:'job-'+(++count)}}; },
    async waitForSeparation(hash) {
      return {success:true,status:'done',data:{files:[
        {name:'vocals.wav',url:'https://example.com/'+hash+'/v'},
        {name:'other.wav',url:'https://example.com/'+hash+'/o'},
      ]}};
    },
  };
};
test('explicit Output nodes return only chosen stem and identify its producer', async () => {
  const graph = new WorkflowGraph();
  const source = graph.source(URL);
  const {vocals:vocalsA} = graph.add(source, Models.BSRoformer);
  const {vocals:vocalsB} = graph.add(source, Models.MelBandRoformer);
  assert.equal(vocalsA.stem,'vocals');
  const final = graph.output(vocalsB, 'Final vocals');
  assert.equal(graph.document.nodes.at(-1).id,final);
  assert.equal(graph.validate().length,4);
  const executor=makeExecutor();
  const report=await graph.run(executor,{allowPaid:true,confirmSubmit:()=>true});
  assert.equal(Object.keys(report.steps).length,2);
  assert.deepEqual(Object.keys(report.exports),['Final vocals']);
  assert.equal(report.exports['Final vocals'].url,'https://example.com/job-2/v');
  assert.equal(report.exports['Final vocals'].from.nodeId,vocalsB.nodeId);
  assert.deepEqual(new WorkflowGraph(graph.document).document,graph.document);
});
test('local File source is never embedded in JSON; it is uploaded only after approval', async () => {
  const graph=new WorkflowGraph();
  const input=graph.sourceFile('test.wav','My recording');
  const {vocals}=graph.add(input,Models.BSRoformer);
  graph.output(vocals,'Vocals');
  assert.equal(graph.document.nodes[0].fileName,'test.wav');
  assert.equal(graph.document.nodes[0].url,'');
  const executor=makeExecutor();
  await assert.rejects(graph.run(executor,{allowPaid:true,confirmSubmit:()=>true}),/Reattach local/);
  assert.equal(executor.calls.length,0);
  const file=new Blob([new Uint8Array([82,73,70,70])],{type:'audio/wav'});
  await assert.rejects(graph.run(executor,{allowPaid:true,confirmSubmit:()=>false,files:{[input.nodeId]:{data:file,filename:'test.wav'}}}),/not authorized/);
  assert.equal(executor.calls.length,0);
  const report=await graph.run(executor,{allowPaid:true,confirmSubmit:()=>true,files:{[input.nodeId]:{data:file,filename:'test.wav'}}});
  assert.equal(executor.calls.length,1);
  assert.equal(executor.calls[0].audiofile.filename,'test.wav');
  assert.ok(!executor.calls[0].url);
  assert.ok(report.exports.Vocals.url.endsWith('/v'));
});
test('FFmpeg processing nodes use explicit local audio and expose only selected exports', async () => {
  const graph = new WorkflowGraph();
  const a=graph.sourceFile('one.wav','One');
  const b=graph.sourceFile('two.wav','Two');
  const merged=graph.process({type:'mix'},[a,b],'Combine');
  graph.output(merged,'Mixed');
  const seen=[];
  const mock={
    backend:'native',
    async process(request) {
      seen.push(request);
      return new Uint8Array([82,73,70,70,1]);
    },
  };
  const report=await graph.run({},{
    files:{
      [a.nodeId]:{data:new Uint8Array([1,2]),filename:'one.wav'},
      [b.nodeId]:{data:new Uint8Array([3,4]),filename:'two.wav'},
    },
    audioProcessor:mock,
  });
  assert.equal(seen.length,1);
  assert.equal(seen[0].inputs.length,2);
  assert.equal(seen[0].effect.type,'mix');
  assert.deepEqual([...report.exports.Mixed.data],[82,73,70,70,1]);
  assert.deepEqual(Object.keys(report.steps),[]);
  const bad=graph.document; bad.nodes.at(-1).input.nodeId=bad.nodes.at(-1).id;
  assert.throws(()=>new WorkflowGraph(bad),/Output nodes cannot feed downstream/);
});
