---
title: Batch processing
description: Schedule multiple separation jobs with budgets, checkpoints and pause/resume.
---

`runBatch` is an optional subpath import. It limits **remote server jobs**, independently of HTTP request concurrency.

```ts
import { runBatch, BatchRunner } from '@rikhoffbauer/mvsep-client/batch';

const runner = new BatchRunner();
const results = await runBatch(client, [
  { id: 'track-1', durationSeconds: 120,
    input: { sepType: 20, url: 'https://example.com/a.wav' } },
  { id: 'track-2', durationSeconds: 150,
    input: { sepType: 20, url: 'https://example.com/b.wav' } },
], {
  maxActiveJobs: 1,
  maxEstimatedCredits: 10,
  checkpointStore: myStore,
  runner,
  onJobEvent(index, phase, value) {
    console.log(index, phase, value);
  },
});
```

`checkpointStore` implements asynchronous `load(): Promise<MvsepJobHandle[]>` and `save(handles): Promise<void>` methods. Use atomic or transactional writes.

## Crash consistency

The runner writes a **pending marker before submitting** each job. After receiving a hash, it saves the accepted handle before polling. On restart, existing handles resume without POST; a pending marker whose outcome is unknown **blocks automatic re-submission**. Reconcile it manually with account history before updating the checkpoint.

This favors avoiding duplicate paid work over automatic replay. A crash between remote acceptance and handle persistence cannot magically recover a missing hash.

## Server concurrency

`maxActiveJobs` defaults to **1**. Requesting more than one checks the account's Premium status. Do not rotate keys merely to evade account quotas; multiple keys can belong to the same account.

## Pause and stop

```ts
runner.pause();  // no new submissions until resumed
runner.resume();
runner.stop();   // abort local work, not accepted server jobs
```

Partial results are returned per input with `index`, optional `id`, `handle`, `result` or `error`. Batch budget preflight uses estimates; unpriced operations are rejected rather than assumed free.
