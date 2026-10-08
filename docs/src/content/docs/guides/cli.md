---
title: Command-line interface
description: Use the bundled mvsep command to inspect, submit, resume and download jobs.
---

Install the package to obtain the `mvsep` binary, available at `node_modules/.bin/mvsep` or through your package manager's executable runner.

```bash
export MVSEP_API_KEY='your-mvsep-api-token'
./node_modules/.bin/mvsep help
```

## Commands

```bash
mvsep models
mvsep submit --file ./song.wav --algorithm 20 --handle job.json
mvsep submit --url https://example.com/song.wav --algorithm 20
mvsep submit --file ./song.wav --preset 635
mvsep status JOB_HASH
mvsep wait JOB_HASH
mvsep resume job.json
mvsep cancel JOB_HASH
mvsep delete JOB_HASH
mvsep download JOB_HASH ./stems
mvsep batch batch.json
```

For structured output add `--json`. Failed commands exit nonzero; validation failures generally exit with code 2.

## Environment

| Variable | Description |
| --- | --- |
| `MVSEP_API_KEY` | Single API token |
| `MVSEP_API_KEYS` | Comma-separated API tokens, preferred for multi-account use |
| `MVSEP_KEY_IDS` | Matching comma-separated stable, non-secret account IDs |
| `MVSEP_BASE_URL` | Optional custom endpoint |

## Batch manifest

```json
{
  "jobs": [
    { "id": "track-a", "file": "./a.wav", "algorithm": 20, "durationSeconds": 180 },
    { "id": "track-b", "url": "https://example.com/b.wav", "algorithm": 20, "durationSeconds": 180 }
  ],
  "maxActiveJobs": 1,
  "maxEstimatedCredits": 10
}
```

The CLI uses `batch.json.checkpoint.json` for durable accepted hashes and pre-submit intent records. Keep it private and do not delete it until jobs are reconciled. Prefer absolute file paths when running manifests from an unexpected working directory.
