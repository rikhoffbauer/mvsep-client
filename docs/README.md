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

Astro uses `site: https://mvsep-client.vercel.app` and `base: /`. Navigation and documentation links are root-relative to the Vercel domain; no GitHub Pages subdirectory or environment override is used.

## Publication

Vercel builds and deploys this directory on pushes to `main` (Vercel project `mvsep-client`, root directory `docs/`). `.github/workflows/docs.yml` independently validates the documentation build, offline examples, relay security and internal links.

The production URL is [mvsep-client.vercel.app](https://mvsep-client.vercel.app/). A push to `main` triggers Vercel deployment; run the GitHub Actions documentation workflow manually for additional validation.

## Editing

- Content: `src/content/docs/**/*.md` and `index.mdx`
- Navigation, branding and deployment base path: `astro.config.mjs`
- Theme accents: `src/styles/custom.css`
- Assets: `public/`

Keep examples in sync with the exported interfaces in `../src/types.ts` and `../src/extended-types.ts`. Do not use real API keys or initiate paid MVSep jobs during documentation testing.

## Browser playground

The [Playground](https://mvsep-client.vercel.app/playground/) imports the browser-compatible full SDK (`src/browser.ts`). MVSep does not allow browser CORS calls, so browser requests go through the separately deployed Vercel relay (`playground-relay/`) after explicit user consent. The relay URL comes from `PUBLIC_MVSEP_RELAY_URL` (or the documented Vercel default); its narrow API allowlist and credential-handling details are documented in the relay directory. Run `node --test playground-relay/test/*.test.mjs` from the repository root to exercise relay safety.
