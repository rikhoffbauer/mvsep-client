import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://rikhoffbauer.github.io',
  base: process.env.MVSEP_DOCS_BASE ?? '/',
  integrations: [
    starlight({
      title: 'MVSep Client',
      description: 'TypeScript SDK for MVSep: stem separation, job orchestration, credits, and streaming downloads.',
      logo: { src: './public/logo.svg', alt: 'MVSep Client' },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/rikhoffbauer/mvsep-client' }],
      editLink: { baseUrl: 'https://github.com/rikhoffbauer/mvsep-client/edit/main/docs/' },
      customCss: ['./src/styles/custom.css'],
      lastUpdated: true,
      sidebar: [
        { label: 'Start here', items: [
          { slug: 'playground' },
          { slug: 'start/introduction' },
          { slug: 'start/installation' },
          { slug: 'start/quickstart' },
          { slug: 'start/configuration' },
        ] },
        { label: 'Guides', items: [
          { slug: 'guides/api-key-rotation' },
          { slug: 'guides/algorithms' },
          { slug: 'guides/submissions' },
          { slug: 'guides/polling' },
          { slug: 'guides/downloads' },
          { slug: 'guides/credits' },
          { slug: 'guides/recovery' },
          { slug: 'guides/batch' },
          { slug: 'guides/webhooks' },
          { slug: 'guides/cli' },
        ] },
        { label: 'API reference', items: [
          { slug: 'reference/client' },
          { slug: 'reference/options' },
          { slug: 'reference/types' },
          { slug: 'reference/errors' },
          { slug: 'reference/utilities' },
        ] },
        { label: 'Recipes & operations', items: [
          { slug: 'recipes/example-gallery' },
          { slug: 'recipes/end-to-end' },
          { slug: 'recipes/production' },
          { slug: 'recipes/troubleshooting' },
        ] },
      ],
    }),
  ],
});
