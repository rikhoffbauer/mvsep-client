---
title: Algorithms & metadata
description: Discover models dynamically, choose options and cache metadata.
---

MVSep algorithms and option values change. Instead of maintaining a static list, read current metadata:

```ts
const algorithms = await client.getAlgorithms([
  'single_upload',
  'matchering_upload',
  'no_upload',
]);
const algorithm = await client.getAlgorithm(20);
console.log(algorithm.name, algorithm.algorithm_fields);
```

Algorithms expose fields such as `render_id`, `name`, `audio_widget`, `price_coefficient` and `algorithm_fields`; unknown fields are preserved.

## Validate a separation request

```ts
const { input } = client.prepareSeparation({
  algorithm,
  input: { url: 'https://example.com/song.wav' },
  fields: { add_opt1: 1 },
});
client.validateSeparation(input, algorithm, {
  strict: true,
  registered: true,
  premium: true,
});
const created = await client.createSeparation(input);
```

Model options can be supplied using canonical `add_opt1` / `add_opt2` / `add_opt3` field names or unambiguous labels from the metadata. Enumerated values are checked against the returned option keys (including when encoded as JSON strings).

Set `strict: false` only to tolerate unknown option metadata. Presets have separate configuration semantics and are not treated as a single algorithm.

## Browse demos and quality results

```ts
const demos = await client.getDemoSeparations({ algorithmId: 20, limit: 20 });
const leaderboard = await client.getQualityLeaderboard({
  datasetType: 10, sort: 'sdr_drums', limit: 20,
});
const entry = await client.getQualityEntry(42);
```

More read-only API examples:

```ts
const news = await client.getNews({ lang: 'en', limit: 5 });
const qualityQueue = await client.getQualityQueue({ start: 0, limit: 10 });
console.log(news.length, qualityQueue.length);
await client.invalidateAlgorithms('single_upload'); // clear cached metadata (if configured)
```

The [runnable discovery example](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/discover-algorithms.ts) walks through current model identifiers and cost estimates without needing API credentials.

Quality benchmark results are contextual reference data, not guaranteed separation quality for an arbitrary song.

## Cache snapshots

```ts
import { FileMetadataCache } from '@rikhoffbauer/mvsep-client/metadata-cache';

const cache = new FileMetadataCache('./.mvsep-models');
const client = new MvsepClient({
  algorithmsCache: cache,
  algorithmsCacheTtlMs: 5 * 60_000,
});

await client.getAlgorithms();             // cached with TTL
await client.getAlgorithms(undefined, { refresh: true });
const snapshot = await cache.readSnapshot(); // can be stale; use for offline inspection only
```

Snapshot metadata is not proof an algorithm is currently offered by the API. Validate against live metadata before submitting a paid job.
