# SteinCMS database workflow

Copy `steincms/` to every new project. **This is the one document that explains
how content becomes a database table, what's optional, and what's automatic.**
Read "The big picture" and "Which files do I touch?" first — everything else
is reference material for when you need the detail.

---

## The big picture

```
YOU WRITE                        AUTOMATIC (you just run these)         RESULT
──────────                       ───────────────────────────────        ──────
content.schema.ts        ──▶     npm run db:sync-schema        ──▶     Drizzle tables (generated .ts)
(fields + collections)           npm run db:generate           ──▶     a SQL migration file
                                  npm run db:migrate            ──▶     applied to data/*.sqlite


Optional — only if a project already has content in the OLD JSON format:

old *.local.json files   ──▶     npm run cms:migrate           ──▶     JSON brought up to date
                                  (the 3 commands above)        ──▶     empty tables exist
                                  npm run db:import-json        ──▶     rows copied into SQLite
```

Three sentences that matter more than anything else in this document:

1. **`content.schema.ts` is the only file you write to describe your data.** Change it, run the 3 commands, you have a real SQLite table.
2. **Nothing reads a JSON file while the app is running.** SQLite is the only place content lives once the server is up — every admin save writes straight to it.
3. **JSON import is a one-time bridge, not part of normal work.** A brand-new project has no JSON to import and skips that whole section below.

---

## Which files do I touch?

Three buckets. If a file isn't in one of these, you almost certainly don't need to touch it.

| Bucket | Files |
|---|---|
| ✍️ **You write these, every project** | `src/content.schema.ts` (your data model), `src/site.config.ts`, `src/cms.ts`, `src/db/client.ts`, `.env` |
| 📋 **Copy as-is from the template, never edit** | everything in `steincms/`, `drizzle.config.ts`, `scripts/db-*.ts`, `scripts/cms-*.ts` |
| 🤖 **Generated — gets overwritten, don't hand-edit** | `src/db/schema/generated/*`, `src/db/cms-database.generated.ts`, `src/db/migrations/*.sql` |

**The one exception:** adding a brand-new *collection* (not just a field on an
existing one) means hand-writing two small files for it — see "Adding a new
collection" below. That's the only per-project code inside `steincms/`'s
territory; everything else there is template code, identical across projects.

---

## Glossary

Three words, in the order you use them, in `content.schema.ts`:

1. **Field** — one piece of data (a title, a date, a list of images). Built with a helper from `steincms/cms/schema/fields/` (`textField()`, `dateField()`, `mediaUrlList()`, …).
2. **Record** — the shape of *one entry*: a group of fields. Built with `defineRecord({ fields: {...} })`. On its own it has no idea how or where it's stored — just a Zod-validated shape.
3. **Collection** — how a record is stored and administered. `defineListCollection({ record, ... })` = many rows (events, posts). `defineSingleton({ record, ... })` = exactly one row (a static page like membership). This is what `db:sync-schema` reads to generate a Drizzle table.

Example: `defineRecord` describes an event's fields → `defineListCollection` wraps it and says "there can be many of these, generate an `events` table."

**"cms-database" does not create a database.** The database *contract* — the shape every project's real Drizzle client is cast to — lives in `steincms/cms/storage/db-contract.ts` (`CmsDatabase`, `DatabaseConnection`, `requireTable`). The actual object with real tables is generated into `src/db/cms-database.generated.ts`.

---

## Commands (plain language)

| Command | What it does |
|---------|----------------|
| `npm run db:sync-schema` | Read `content.schema.ts` → write generated TypeScript (tables + DB wiring) |
| `npm run db:generate` | sync-schema + create a new SQL migration file (when columns changed) |
| `npm run db:migrate` | Apply pending SQL migrations to the SQLite file |
| `npm run db:smoke` | Quick check that the database stores return data |
| `npm run cms:prune-media` | Delete media files no longer referenced by any row in the database (dry run by default, `--apply` to actually delete) |
| `npm run db:studio` | Open Drizzle Studio to browse rows |
| `npm run cms:migrate` | *(JSON import only)* bring a collection's JSON file up to the current content schema version |
| `npm run cms:status` | *(JSON import only)* report version drift for collections that have a `jsonImportPath` |
| `npm run db:import-json` | *(JSON import only)* copy a collection's JSON file into its SQLite table (`-- --verify` checks counts, `-- --dry-run` previews) |

**Not "codegen".** We call it **sync-schema** — it keeps TypeScript and SQL in sync with `content.schema.ts`.

---

## New project — step by step

### 1. Copy template files (once)

From the ✍️ and 📋 buckets above: the entire `steincms/` folder, `drizzle.config.ts`, `src/db/client.ts`, `scripts/db-*.ts`, and the `db:*`/`cms:*` npm scripts. Skip `scripts/db-import-json.ts`, `cms-migrate.ts`, `cms-status.ts` if this project has no existing JSON content to import.

### 2. Define content (project-specific)

**File:** `src/content.schema.ts` — list collections (`defineListCollection`), singleton pages (`defineSingleton`), field definitions per record. Omit `jsonImportPath` entirely for a collection starting empty in the database.

**File:** `src/site.config.ts` — site name, URLs, admin path, event categories.

### 3. Wire CMS (project-specific, small files)

**File:** `src/db/cms-database.ts` (one line):

```typescript
export { cmsDatabase } from './cms-database.generated';
```

**File:** `src/cms.ts`:

```typescript
import { createCms } from '@steincms/cms/create-cms';
import { cmsDatabase } from './db/cms-database';
import { contentSchema } from './content.schema';
import { siteConfig } from './site.config';

export const cms = createCms({ siteConfig, contentSchema, database: cmsDatabase });
```

**File:** `.env`:

```
DATABASE_URL=./data/admin_cms.sqlite
```

### 4. Build database files

```bash
npm run db:sync-schema    # writes src/db/schema/generated/* + cms-database.generated.ts
npm run db:generate       # + a SQL migration file if the schema changed
npm run db:migrate        # apply migrations to SQLite
npm run db:smoke
```

A fresh project's tables start **empty** — add content through the admin UI.
Bringing in an existing site's content instead? Read the next section first.

### 5. Test in browser

```bash
npm run dev
```

Checklist: admin login → events list → edit/save event → membership page → save membership.

---

## Migrating an existing JSON-based site onto the database

Skip this whole section for a brand-new project with no prior content — go
straight to step 4 above. This is for the case where a site already has
content sitting in `*.local.json` files and needs it moved into SQLite. It's
a supported, first-class path, run **once** per site:

```bash
npm run cms:migrate                 # 1. bring each collection's JSON file up to the current schema version
npm run db:sync-schema              # 2. ┐
npm run db:generate                 #    ├─ create the (empty) tables — same 3 commands as step 4 above
npm run db:migrate                  #    ┘
npm run db:import-json              # 3. copy the JSON files into their SQLite tables
npm run db:import-json -- --verify  # 4. confirm JSON and DB row counts match
npm run db:smoke                    # 5. confirm the live stores read the imported rows
```

What each piece is for:

- **`jsonImportPath`** on a collection in `content.schema.ts` is the path to its JSON file. `cms:migrate`/`cms:status` only look at collections that set one — a DB-only collection without it is skipped, not an error.
- **`scripts/db-import-json.ts`** is hand-written against *this* project's actual collections (`events`, `posts`, `registrations`, `activityLog`, `membership`, `homepage`). Treat it like `content.schema.ts` itself — a template to copy and adapt for a new project's collections, not a generic tool that works unmodified everywhere.
- Once imported and verified, the JSON files aren't read by anything at runtime anymore — keep them as a backup or delete them.

---

## Day-to-day (existing project)

**Change a field or collection in `content.schema.ts`:**

```bash
npm run db:sync-schema
npm run db:generate
npm run db:migrate
```

**If the new field must appear in admin read/write:** update the row mapper in the matching `*-store.database.ts` file — the one step codegen doesn't cover (see below).

**Adding a brand-new collection** (e.g. "products", not just a field on an existing one):

1. Add it to `content.schema.ts`.
2. Run the 3 commands above.
3. Hand-write `products-store.ts` (business logic) + `products-store.database.ts` (row ↔ record mapping) — copy `events-store.ts` / `events-store.database.ts` as your starting point.
4. Wire it into `steincms/cms/create-cms.ts` alongside events/posts.

---

## Template logic vs DB adapters

Two hand-written layers per collection (events, posts, …) — both are template
code, identical across projects except when a field is added:

```
*-store.ts              Logic: validate, slugify, create, update, delete
       ↑
       │ RecordListStorage plug-in (required — every project passes the DB adapter)
       ↓
*-store.database.ts     Adapter: SQL rows ↔ TypeScript objects
```

| Layer | Adjust when… |
|-------|----------------|
| **`*-store.ts`** | Business rules change (validation, slugs, admin behaviour) |
| **`*-store.database.ts`** | A field in `content.schema.ts` was added/removed/renamed |
| **`create-cms.ts`** | A new collection type needs wiring (e.g. a third list with a custom editor) |
| **`singletons-store.ts`** | Rarely — singleton pages share one table |

---

## File reference

Grouped by the three buckets from "Which files do I touch?" above.

### ✍️ You write (`src/`)

| File | Role |
|------|------|
| `content.schema.ts` | Source of truth for fields and collections |
| `site.config.ts` | Site name, URLs, admin path, feature flags |
| `cms.ts` | Passes config + database into steincms |
| `db/client.ts` | Opens SQLite (`DATABASE_URL`) |
| `db/cms-database.ts` | One-line re-export of the generated wiring |

### 📋 Copy as-is (`steincms/`)

| File | Role |
|------|------|
| `cms/create-cms.ts` | Creates stores, API handlers, admin nav |
| `cms/storage/db-contract.ts` | The DB contract (`CmsDatabase`, `requireTable`) every adapter is written against — not a database itself |
| `cms/schema/schema-builders.ts` | `defineRecord` / `defineListCollection` / `defineSingleton` — the API you call in `content.schema.ts` |
| `cms/schema/schema-query.ts` | Read-side helpers over an already-built schema (`iterateCollections`, `hasFieldKind`, …) — used by codegen/admin/handlers, not by `content.schema.ts` |
| `cms/events/events-store.ts` + `.database.ts` | Event business logic + SQLite adapter |
| `cms/posts/posts-store.ts` + `.database.ts` | Post business logic + SQLite adapter |
| `cms/events/registrations-store.ts` + `.database.ts` | Registration types + SQLite adapter |
| `cms/activity-log.ts` + `.database.ts` | Activity-log types + SQLite adapter |
| `db/singletons-store.ts` | Static pages (membership, …) ↔ SQLite |
| `db/generate-schemas.ts` | Orchestrates `db:sync-schema` |
| `db/generate-db-wiring.ts` | Writes `cms-database.generated.ts` |
| `db/field-to-drizzle.ts` | Field types → Drizzle columns |
| `cms/collection-store.ts` | JSON-import-only: schema-version migrations for `cms:migrate` |
| `scripts/db-sync-schema.ts` | Entry point for `npm run db:sync-schema` |
| `scripts/db-store-smoke.ts` | Smoke test |
| `scripts/cms-prune-media.ts` | Delete media orphaned in the database |
| `scripts/cms-migrate.ts`, `cms-status.ts`, `db-import-json.ts` | JSON-import-only, see the section above |

### 🤖 Generated (`src/db/`)

| File | Role |
|------|------|
| `schema/generated/*` | One Drizzle table per list/singleton collection |
| `cms-database.generated.ts` | `{ open, tables: { events, posts, … } }` |
| `migrations/*.sql` | SQL history — **commit these to git** |

---

## Git: commit migrations?

**Yes.** Commit these to git:

- `src/db/migrations/*.sql`
- `src/db/migrations/meta/*`
- `src/db/schema/generated/*`
- `src/db/cms-database.generated.ts`

Do **not** commit:

- `data/admin_cms.sqlite` (local/runtime database — keep in `.gitignore`)
- `data/locks/` (write-serialization lock files, not data)
- `.env`

Every developer and production deploy runs `npm run db:migrate` to apply the same SQL history.

---

## Runtime flow

```
Browser / API
  → steincms/api/handlers/*
  → *-store.ts (logic)
  → *-store.database.ts (SQL)
  → cmsDatabase.open()
  → data/admin_cms.sqlite
```

No JSON read/write path exists at runtime — `*-store.ts` requires a storage
adapter now, it never falls back to reading/writing a file.

---

## Testing

**Automated:**

```bash
npm run db:smoke
```

**Manual (admin):**

1. `npm run dev`
2. Log in to admin
3. Events list shows data
4. Edit event → save → reload → change persisted
5. Membership page loads and saves
6. Registration creates ticket (if enabled)

**Inspect data:**

```bash
npm run db:studio
```
