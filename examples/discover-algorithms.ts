/** Read-only algorithm metadata discovery. Run: bun run examples/discover-algorithms.ts */
import { MvsepClient, estimateJobCredits } from '../src/index.js';

const client = new MvsepClient(); // listing algorithms does not require a token
const all = await client.getAlgorithms(['single_upload', 'no_upload', 'matchering_upload']);
console.table(all.map(model => ({
  id: model.render_id, name: model.name, widget: model.audio_widget,
  creditCoefficient: model.price_coefficient ?? 'unknown',
})).slice(0, 25));

const example = all.find(model => model.audio_widget === 'single_upload');
if (example) {
  console.log('Sample option fields:', example.algorithm_fields ?? []);
  const estimate = estimateJobCredits(example, 180);
  console.log('Example cost for 3 min:', estimate.estimatedCredits ?? 'unknown');
  if (example.algorithm_fields?.length) {
    const field = example.algorithm_fields.find(value => value.name === 'add_opt1');
    console.log('First optional field:', field);
  }
}
