# MVSep Client documentation

This directory is an independent [Astro Starlight](https://starlight.astro.build/) project that documents the TypeScript SDK one directory above.

## Local development

```bash
cd docs
bun install --frozen-lockfile
bun run dev
```

To verify the static output:

```bash
bun run build
bun run check:links
bun run preview
```

The site uses `site: https://rikhoffbauer.github.io` and `base: /mvsep-client` to work when published from this GitHub repository. All root-relative links must include `/mvsep-client/`.

## Publication

`.github/workflows/docs.yml` builds this directory using its own `bun.lock`, validates all local site links and uploads `docs/dist/` as a GitHub Pages artifact. The deploy job then publishes it via `actions/deploy-pages`. The Pages source must be **GitHub Actions** (not the legacy branch publisher).

The production URL is [rikhoffbauer.github.io/mvsep-client](https://rikhoffbauer.github.io/mvsep-client/). A change to `docs/**` on `main` triggers deployment, or use workflow dispatch manually.

## Editing

- Content: `src/content/docs/**/*.md` and `index.mdx`
- Navigation, branding and deployment base path: `astro.config.mjs`
- Theme accents: `src/styles/custom.css`
- Assets: `public/`

Keep examples in sync with the exported interfaces in `../src/types.ts` and `../src/extended-types.ts`. Do not use real API keys or initiate paid MVSep jobs during documentation testing.

## Browser playground

The [Playground](https://rikhoffbauer.github.io/mvsep-client/playground/) imports the browser-ready core SDK (`src/browser.ts`). MVSep does not allow browser CORS calls, so browser requests go through the separately deployed Vercel relay (`playground-relay/`) after explicit user consent. The relay URL comes from `PUBLIC_MVSEP_RELAY_URL`; its narrow API allowlist and credential-handling details are documented in the relay directory. Run `node --test playground-relay/test/*.test.mjs` from the repository root to exercise relay safety.
