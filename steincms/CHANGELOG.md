# Changelog

All notable changes to the steinCMS CMS folder are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] - 2026-08-29

### Added

- SQLite/Drizzle persistence: `content.schema.ts` → `npm run db:sync-schema` generates Drizzle tables + `src/db/cms-database.generated.ts`; `db:generate`/`db:migrate` create and apply SQL migrations (see `steincms/DATABASE.md`, new)
- `*-store.database.ts` adapters (events, posts, registrations, activity log) and `db/singletons-store.ts` — every project store now reads/writes SQLite through `createCms({ ..., database })`
- `npm run cms:migrate` / `cms:status` / `db:import-json` — first-class, supported path for bringing an existing JSON-based site's content onto the database
- `npm run cms:prune-media` now scans the database (not JSON files) to decide which media files are still referenced

### Changed

- `createCms()` now requires `database` — the JSON read/write path in `*-store.ts` is gone, `storage` is a required argument
- A collection's `path` field is renamed `jsonImportPath` and is now **optional** — it's read only by the JSON-import tooling above, never by the live app; omit it for a collection that starts empty in the database
- The per-collection write lock ([core/file-store.ts](steincms/cms/core/file-store.ts)) no longer depends on a JSON path — it was breaking `ENOENT` on a fresh project that never created `src/content/...`
- `steincms/cms/storage/cms-database.ts` renamed to `db-contract.ts` (it's a type contract, not a database) and `steincms/db/generate-cms-database.ts` renamed to `generate-db-wiring.ts`
- `steincms/cms/schema/` consolidated from 6 files to 4: `define-record.ts` + `collection-def.ts` → `schema-builders.ts` (the define-time API), `registry.ts` + `introspection.ts` → `schema-query.ts` (the read-time API) — no change to the public `@steincms/cms/schema` import surface

### Fixed

- `assertContentSchemaVersions` (runs on every `astro dev`/`build` via `cmsIntegration`) crashed for any collection without a JSON source — now skips DB-only collections
- `cms:prune-media` previously read stale/absent JSON files to decide what media was "referenced" and could delete files still in use by DB-backed content

### Site adaption

- Bump `cms.expectedSteinCMSVersion` in `src/site.config.ts` to `1.2.0`
- Run `npm run db:sync-schema && npm run db:generate && npm run db:migrate` after pulling this update
- If a collection previously set `path` in `content.schema.ts`, rename it to `jsonImportPath`

## [1.1.0] - 2026-08-26

### Added

- Signed form token (`_sibop`) for public event registration — time-limited proof-of-fetch, not CSRF
- `@steincms/cms/forms/RegistrationForm.astro` with JS-injected rotating bait field
- `@steincms/cms/forms/RegistrationField.astro` and `RegistrationFieldList.astro` for slot composition
- Registration form layout defaults, stable classes, and `--registration-*` theme variables
- Strict zod schema for registration POST bodies
- Idempotent registration on `(eventId, email)` — duplicate submit returns existing ticket
- Registration observability counters (`token_invalid`, `too_fast`, `bait`, `schema`, …)
- Optional Cloudflare Turnstile wiring (`PUBLIC_TURNSTILE_SITEKEY`, `TURNSTILE_SECRET_KEY`)

### Changed

- Removed static `website` honeypot from event registration
- Admin login bait field is now JS-injected; session CSRF unchanged
- `register-event` handler validates origin, form token, min submit age, schema, and bait
- Event registration rate limiting delegated to nginx (`limit_req`) and fail2ban (429 jail)
- Registration form paint (colors, borders, fonts) is themed via `--registration-*` variables; the shell only ships layout

### Removed

- `LOGIN_HONEYPOT_FIELD` export from `admin-auth.ts`

## [0.9.0] - 2026-08-17

Initial SteinCMS release.

### Added

- Content schema registry (`src/content.schema.ts`): `defineRecord`, `defineListCollection`, `defineSingleton`
- Declarative field builders (`textField`, `fieldGroup`, `contentBlockList`, `mediaUrlList`, `registrationFormField`, …)
- `textField({ rows })` — `rows > 1` renders a textarea in `SchemaForm`
- `fieldGroup({ label, fields })` — nested field builders with their own labels
- `createCms({ siteConfig, contentSchema })` bootstrap for stores, handlers, admin nav, and paths
- Astro `cmsIntegration` injects CMS API routes (events, posts, upload, logout, singleton content, registrations)
- Content envelope format with per-file `schemaVersion`; version gate (steinCMS code pin + content schema check)
- `npm run cms:migrate` and `npm run cms:status` CLI
- Generic collection store (list + singleton); events/posts stores; `createRegistrationsStore`
- `createCollectionContentHandler` for schema-driven singleton APIs
- `buildAdminNav` / `buildAdminPaths` from content schema
- Admin components: `SchemaForm` (schema-driven nested controls), `EventEditorPage`, `AdminGuestList`, login, dashboard, planner
- `loadEventEditorState()` for editor URL/id/redirect/source wiring
- `eventForDisplay`, `eventEditorPanelsFromRecord`, shared `jsonResponse`
- Configurable public API allowlist on `createAuthMiddleware`
- Zod-based base schemas for events and posts

### Site adaption

- Set `cms.expectedSteinCMSVersion` in `src/site.config.ts` to `0.9.0` (must match `steincms/manifest.json`)
- Register collections in `src/content.schema.ts` via `defineRecord({ fields: { ... } })`
- Add `src/cms.ts` that exports `createCms(...)` as `cms`
- Register `cmsIntegration({ cmsModule: './src/cms.ts', siteConfig, contentSchema })` in `astro.config`
- Point middleware at `createAuthMiddleware({ adminPath, publicApiPaths: cms.publicApiPaths })`
- Compose admin pages from `@steincms/admin/components`; event editor via `loadEventEditorState` + `{...editor.props}`
- Optional: `siteConfig.registrations.ticketPrefix` (e.g. `GX`)
- Run `npm run cms:migrate` after copying `steincms/`
