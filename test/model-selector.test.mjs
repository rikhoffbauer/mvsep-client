import test from 'node:test';
import assert from 'node:assert/strict';
import { Models, parseModelSelector, rankModels, selectModels, modelFromAlgorithm } from '../dist/workflow.js';

test('format-like selectors parse stem requirements and a model override', () => {
  assert.deepEqual(parseModelSelector('best[vocals+drums]@20'),
    { prefer:'best', stems:['vocals','drums'], modelId:20, maxJobs:1 });
  assert.deepEqual(parseModelSelector('cheapest[vocals, bass]'),
    { prefer:'cheapest', stems:['vocals','bass'] });
  assert.throws(()=>parseModelSelector('best[]'), /Selector/);
  assert.throws(()=>parseModelSelector('worst[vocals]'), /Selector/);
});

test('selection uses published stems, avoids redundant jobs and explains ranking evidence', () => {
  const picked = selectModels('best[vocals+drums]');
  assert.deepEqual(picked.steps.map(s=>s.modelId), [63]);
  assert.equal(picked.outputs.vocals.step, 0);
  assert.equal(picked.outputs.drums.stem, 'drums');
  assert.equal(picked.priceCoefficient, 1);
  assert.ok(picked.reasons.some(r=>r.includes('not a measured audio-quality')));
  for (const plan of rankModels('best[vocals+drums]',undefined,25)) {
    if (plan.steps.length === 2 && !plan.steps[1].input) {
      assert.equal(new Set(Object.values(plan.outputs).map(o=>o.step)).size, 2);
    }
  }
});

test('explicit override and MVSep output variants are respected', () => {
  const plan = selectModels('best[piano+guitar]@20');
  assert.deepEqual(plan.steps.map(s=>s.modelId), [20]);
  assert.equal(plan.steps[0].options.add_opt1, '2');
  assert.equal(plan.outputs.piano.stem, 'piano');
  assert.equal(plan.outputs.guitar.stem, 'guitar');
  assert.throws(()=>selectModels('best[vocals+unobtainium]@20'), /No available/);
});

test('selection can plan two jobs, disambiguates same stem names, and honors cost caps', () => {
  const plan = selectModels({stems:['vocals','kick'],maxJobs:2});
  assert.equal(plan.steps.length,2);
  assert.notEqual(plan.outputs.vocals.step, plan.outputs.kick.step);
  assert.ok(plan.steps.every(s=>s.modelId>=0));
  assert.throws(()=>selectModels({stems:['vocals','kick'],maxJobs:1,allowedModelIds:[20]}), /No available/);
  const cheapest = selectModels('cheapest[vocals+drums]');
  assert.equal(cheapest.priceCoefficient, 1);
  assert.ok(rankModels({stems:['vocals','kick'],maxPriceCoefficient:1}).length === 0 ||
      rankModels({stems:['vocals','kick'],maxPriceCoefficient:1}).every(plan=>plan.priceCoefficient<=1));
});

test('live metadata works, unknown costs stay null and inactive algorithms stay excluded', () => {
  const fake = [
    {render_id:530,name:'Mock multi',audio_widget:'single_upload',outputs:'{"vocals":"Vocals","drums":"Drums"}',rating:{average:5,total:3}},
    {render_id:531,name:'Inactive',audio_widget:'single_upload',is_active:0,outputs:'{"vocals":"Vocals","drums":"Drums"}'},
  ];
  const plan = selectModels({stems:['vocals','drums']},fake);
  assert.equal(plan.steps[0].modelId,530);
  assert.equal(plan.priceCoefficient,null);
  assert.equal(rankModels({stems:['vocals','drums'],maxPriceCoefficient:1},fake).length,0);
  assert.equal(modelFromAlgorithm(fake[0]).stems.length,2);
  assert.equal(Models.Mega53StemModel.stems.length,52);
});
