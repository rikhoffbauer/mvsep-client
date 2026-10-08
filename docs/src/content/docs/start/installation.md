---
title: Installation
description: Install the SDK directly from GitHub for npm, Bun or Node.js.
---

The SDK is available from [its GitHub repository](https://github.com/rikhoffbauer/mvsep-client). It is not necessary to publish it to the npm registry.

## Bun

```bash
bun add git@github.com:rikhoffbauer/mvsep-client.git
```

## npm

```bash
npm install 'git+ssh://git@github.com/rikhoffbauer/mvsep-client.git'
```

The repository may be private. Configure GitHub SSH authentication before installing. The `github:` shorthand may return a 404 for a private repository; the SSH forms above are tested. The package includes precompiled JavaScript, type declarations, source maps and the CLI, so **no install-time build or trusted dependency script** is necessary.

## Runtime requirements

- Node.js **20 or newer**, or Bun.
- Native `fetch`, `FormData`, `Blob` and Web Streams (provided by both runtimes).
- TypeScript is optional in consuming projects. The SDK is ESM-only.
- An [MVSep API key](https://mvsep.com/en/full_api) to submit and manage account-bound jobs.

## Verify the installation

```bash
bun -e "import { MvsepClient } from '@rikhoffbauer/mvsep-client'; console.log(new MvsepClient().baseUrl)"
# https://mvsep.com/api
```

Or:

```ts
import { MvsepClient } from '@rikhoffbauer/mvsep-client';
const client = new MvsepClient({ apiKeys: process.env.MVSEP_API_KEY });
```

## Browser-compatible client

The package provides a browser-specific entry point exposing the full API client without eagerly importing Node.js filesystem modules:

```ts
import { MvsepClient } from '@rikhoffbauer/mvsep-client/browser';

const client = new MvsepClient({
  apiKeys: ['key-one', 'key-two'],
  keyRotation: { strategy: 'round_robin' },
});
```

**Important:** MVSep does not currently return browser CORS headers. A direct browser `fetch` will be blocked even with valid keys. The [interactive playground](/playground/) integrates a carefully restricted HTTPS relay with an explicit consent notice. Browser users can supply a compatible `fetch` adapter and must understand who operates it. Disk-backed helpers such as `fileBlobFromPath` and atomic `downloadToFile` require Node.js; browser API methods and in-memory blobs work.

## CLI

The same package installs a `mvsep` executable:

```bash
bunx mvsep help
# or: ./node_modules/.bin/mvsep help
```

Continue with the [quick start](/start/quickstart/).
