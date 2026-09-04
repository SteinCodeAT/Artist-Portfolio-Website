import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import icon from "astro-icon";
import sitemap from '@astrojs/sitemap'
import compressor from "astro-compressor";
import { cmsIntegration } from './steincms/astro/cms-integration';
import { authEnvSchema, publicEnvSchema } from './steincms/astro/env-schema';
import { siteConfig } from './src/site.config';
import { contentSchema } from './src/content.schema';
import Database from 'better-sqlite3';
import fs from 'node:fs/promises';

// public/media/ holds CMS-uploaded images (steincms/cms/media/media-store.ts
// writes new uploads straight into it at runtime). Astro's build also copies
// the whole public/ dir into dist/client/ once, at build time — and the
// @astrojs/node standalone adapter's production server serves static files
// straight out of that dist/client/ copy, taking priority over any page
// route at the same path. Left alone, that means the very first build after
// a deploy freezes every media file at whatever it was at that moment: a
// cover image changed or removed afterwards via the admin updates the DB
// and public/media/ correctly, but the running server keeps serving the
// stale dist/client/media/ copy forever — exactly the "can't change the
// cover image on production" bug. src/pages/media/[...path].ts serves
// public/media/ live on every request instead, but only if nothing in
// dist/client/media/ exists to shadow it — hence deleting that copy here,
// right after the build finishes.
function excludeMediaFromStaticOutput() {
  return {
    name: 'exclude-media-from-static-output',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        await fs.rm(new URL('media/', dir), { recursive: true, force: true });
      },
    },
  };
}

// /projects/[slug] is rendered on demand (prerender = false — see that
// file for why), so @astrojs/sitemap can no longer discover those URLs by
// crawling the build output the way it does for static routes. Read the
// published slugs straight from the DB at config time and hand them to the
// sitemap explicitly, or every project page silently drops out of
// sitemap.xml.
//
// A direct better-sqlite3 read here, not an import of src/cms.ts: the CMS
// module graph pulls in steincms/api/log-cms-activity.ts, which uses
// `astro:env/server` — a virtual module Astro only resolves once its own
// Vite pipeline is running, not while astro.config.mjs itself is being
// loaded. Reading the table directly sidesteps that entirely.
function loadPublishedProjectUrls() {
  try {
    const sqlite = new Database(process.env.DATABASE_URL ?? './data/admin_cms.sqlite', { readonly: true });
    try {
      const rows = sqlite.prepare("SELECT slug FROM posts WHERE status = 'published'").all();
      return rows.map((row) => `https://www.cagdascecen.com/projects/${row.slug}/`);
    } finally {
      sqlite.close();
    }
  } catch {
    // Fresh checkout, DB not created yet (npm run db:sync-schema hasn't run) — an
    // empty sitemap entry list is fine, the build shouldn't fail over this.
    return [];
  }
}

const publishedProjectUrls = loadPublishedProjectUrls();

// astro.config.mjs
export default defineConfig({
  site: 'https://www.cagdascecen.com',
  base: '',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    // Runs before compressor() so it isn't wasting time gzip/brotli-ing
    // media files that are about to be deleted anyway.
    excludeMediaFromStaticOutput(),
    sitemap({ customPages: publishedProjectUrls }),
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
    // Required for checkOrigin behind nginx TLS termination. Without this,
    // Astro ignores X-Forwarded-Proto and sees http://www… while the
    // browser Origin is https://www… — which 403s the login POST.
    allowedDomains: [{ hostname: 'www.cagdascecen.com', protocol: 'https' }],
  },
  vite: {
    resolve: {
      alias: {
        '@steincms': fileURLToPath(new URL('./steincms', import.meta.url)),
      },
    },
  },
});
