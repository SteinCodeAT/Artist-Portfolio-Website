import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import sitemap from '@astrojs/sitemap'
import compressor from "astro-compressor";
import { cmsIntegration } from './steincms/astro/cms-integration';
import { authEnvSchema, publicEnvSchema } from './steincms/astro/env-schema';
import { siteConfig } from './src/site.config';
import { contentSchema } from './src/content.schema';

// astro.config.mjs
export default defineConfig({
  site: 'https://cagdascecen.com',
  base: '',
  integrations: [
    sitemap(),
    icon(),
    compressor(),
    cmsIntegration({ cmsModule: './src/cms.ts', siteConfig, contentSchema }),
  ],
  env: {
    schema: { ...authEnvSchema, ...publicEnvSchema },
  },
  security: {
    // defineConfig() has no Vite-style callback form (unlike Vite's own
    // defineConfig) — it's a plain identity function, so a function passed
    // here would silently break config resolution. NODE_ENV is the correct
    // dev/build signal instead: Astro sets it to 'production' for
    // build/preview and leaves it as 'development' for `astro dev`.
    checkOrigin: process.env.NODE_ENV === 'production',
  },
  vite: {
    resolve: {
      alias: {
        '@steincms': fileURLToPath(new URL('./steincms', import.meta.url)),
      },
    },
  },
});
