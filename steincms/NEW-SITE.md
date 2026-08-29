# New Site Checklist

Use this when copying the template to a new client project.

## 1. Copy the repository

Copy the full project (or start from the canonical template repo). The `steincms/` folder stays **identical** — do not edit it per client. For the database layer specifically (which project-root files to copy alongside it, e.g. `scripts/db-*.ts`, `drizzle.config.ts`), see the "Copy template files" step in [`steincms/DATABASE.md`](DATABASE.md).

## 2. Configure the client

Edit [`src/site.config.ts`](../src/site.config.ts) (see [`src/site.config.example.ts`](../src/site.config.example.ts)):

- `name`, `tagline`, `baseUrl`, `lang`
- `admin.path`, `admin.title`
- `theme.fonts`, `theme.colors`
- `features.events`, `features.blog`
- `events.categories`, `events.registrationEmail`, `events.publicPath`
- `registrations.ticketPrefix` (if events have registration forms)
- `nav` links
- `cms.expectedSteinCMSVersion` (must match `steincms/manifest.json`)

## 3. Content schema

Register collections in [`src/content.schema.ts`](../src/content.schema.ts) — fields, Zod shapes, and admin metadata live here (single source of truth). See [`steincms/DATABASE.md`](DATABASE.md) for the glossary, full workflow, and a file-by-file map of what's generated vs. hand-written.

After changing it, build the database:

```bash
npm run db:sync-schema
npm run db:generate
npm run db:migrate
```

Migrating an existing site's JSON content instead of starting empty? Set `jsonImportPath` on the relevant collections and follow "Migrating an existing JSON-based site" in `steincms/DATABASE.md` (`cms:migrate` → the 3 commands above → `db:import-json`).

## 4. Bootstrap CMS

Create `src/cms.ts`:

```ts
import { createCms } from '@steincms/cms/create-cms';
import { contentSchema } from './content.schema';
import { siteConfig } from './site.config';

export const cms = createCms({ siteConfig, contentSchema });
```

Wire Astro (`astro.config.mjs`):

- Alias `@steincms` → `./shared`
- `env.schema`: `authEnvSchema` from `steincms/astro/env-schema.ts`
- `cmsIntegration({ cmsModule: './src/cms.ts', siteConfig, contentSchema })`

CMS API routes (`/api/update-events`, `/api/posts`, `/api/upload-image`, `/api/logout`, `/api/content/[collection]`, registration endpoints) are injected. Do not copy those files into `src/pages/api/`. Add extra site-specific APIs there only when needed.

Middleware:

```ts
import { createAuthMiddleware } from '@steincms/auth/create-middleware';
import { cms } from './cms';

export const onRequest = createAuthMiddleware({
	adminPath: cms.siteConfig.admin.path,
	publicApiPaths: cms.publicApiPaths,
});
```

## 5. Environment

```bash
cp .env.example .env
```

Set at minimum:

- `SESSION_SECRET` (32+ chars, not a placeholder value)
- `auth.yaml` — copy from `auth.example.yaml`, then run `npm run hash_password` and paste the hash into each user's `password_hash` field

Optional: `AUTH_FILE` (defaults to `auth.yaml`), `PUBLIC_MAILCHIMP_FORM_ACTION`, `PUBLIC_MAILCHIMP_HONEYPOT`

## 6. Branding

Replace client-specific files:

- `src/components/Header.astro`, `Footer.astro`, `Hero.astro`, homepage sections
- `src/assets/images/` (logo, textures, marketing images)
- Legal pages: `impressum.astro`, `datenschutz.astro`, `kontakt.astro`
- `conf/` deployment configs for the new domain

## 7. Optional public routes

| Feature | Keep / customize | Remove if unused |
|---------|------------------|------------------|
| Events | `src/pages/veranstaltungen/` (or `events.publicPath`) | Set `features.events: false`, omit pages |
| Blog | `src/pages/blog/` | Set `features.blog: false`, omit pages |
| Membership | `src/pages/mitgliedschaft.astro` | Delete page |

Event detail pages with registration must use `export const prerender = false` and
`<RegistrationForm eventId={event.id}>` from `@steincms/cms/forms/RegistrationForm.astro`.
The form token is minted per response — set `Cache-Control: no-store` on the page.
Optional Turnstile: set `PUBLIC_TURNSTILE_SITEKEY` and `TURNSTILE_SECRET_KEY` in `.env`.

Drop in the default fields, or compose them yourself:

```astro
---
import RegistrationForm from '@steincms/cms/forms/RegistrationForm.astro';
import RegistrationFieldList from '@steincms/cms/forms/RegistrationFieldList.astro';
---

<RegistrationForm eventId={event.id}>
  <RegistrationFieldList fields={registrationForm.fields} guestsMax={guestsMax} />
</RegistrationForm>
```

```astro
---
import RegistrationForm from '@steincms/cms/forms/RegistrationForm.astro';
import RegistrationField from '@steincms/cms/forms/RegistrationField.astro';
---

<RegistrationForm eventId={event.id}>
  <label class="register-field">…name / email / guests…</label>
  {registrationForm.fields.map((field) => (
    <RegistrationField field={field} />
  ))}
</RegistrationForm>
```

The shell ships layout defaults (flex, gap, padding). Theme by setting CSS variables on a wrapper so they inherit into the form, and/or by targeting the stable classes from a global stylesheet or `:global()`:

- Classes: `.registration-form`, `.register-field`, `.register-custom`, `.register-choice`, `.register-counts`, `.register-submit`, `.register-status`
- Variables: `--registration-font`, `--registration-color`, `--registration-input-bg`, `--registration-input-border`, `--registration-focus`, `--registration-accent`, `--registration-submit-bg`, `--registration-submit-color`, `--registration-submit-hover`, `--registration-status-color`

`RegistrationForm` accepts `class` and `submitClass`. `RegistrationField` / `RegistrationFieldList` accept `class` (merged onto each field).

## 8. Content directories

```bash
mkdir -p public/media/events public/media/posts
```

**Fresh project:** that's it — the database starts empty. Add events/posts/pages through the admin UI once it's running (step 9).

**Migrating an existing site instead:** copy its `event-data.local.json` / `post-data.local.json` into `src/content/...`, set `jsonImportPath` on those collections in `content.schema.ts`, then run the "Migrating an existing JSON-based site" steps in `steincms/DATABASE.md`.

## 9. Admin area

Admin pages live under `src/pages/<admin-path>/` (folder name must match `siteConfig.admin.path`). Build them from shared components; add client-specific logic on the page when needed.

Typical pages:

- `login.astro` — wrap `AdminLoginPage` (boilerplate below)
- dashboard — `DashboardHeader`, `DashboardCardList`, `DashboardCard`
- calendar — `PlannerCalendar`
- event list / editor — `AdminPostList`, `EventEditorPage`, `AdminGuestList`
- singleton pages — `SchemaForm`

Login route:

```astro
---
export const prerender = false;

import AdminLoginPage from '@steincms/admin/components/AdminLoginPage.astro';
import { handleAdminLoginRoute } from '@steincms/admin/components/admin-login.server';
import { siteConfig } from '../../site.config';
import Logo from '../../assets/images/logo.png';

const result = await handleAdminLoginRoute(Astro, { siteConfig, logoSrc: Logo.src });
if (result.response) return result.response;
---

<AdminLoginPage {...result.view} />
```

Save as `src/pages/<admin-path>/login.astro` (path without leading slash).

Use `cms.nav` and `cms.adminPaths` from `src/cms.ts` in the site admin layout.

## 10. Sync shared updates

When updating `steincms/` on an existing site:

1. Copy the new `steincms/` folder from the canonical repo
2. Run `npm run cms:status`
3. If content schema mismatch → `npm run cms:migrate`
4. Read [`CHANGELOG.md`](CHANGELOG.md) for API/site-adaption steps
5. Bump `cms.expectedSteinCMSVersion` in `src/site.config.ts` to match `steincms/manifest.json`
6. Run `npm run build`

When fixing bugs in `steincms/` (canonical repo):

1. Apply fix in the canonical template repo
2. Bump `sharedVersion` in `steincms/manifest.json` and document in `CHANGELOG.md`
3. Copy the entire `steincms/` folder to each client repo

## 11. Verify

```bash
npm install
npm run build
npm run preview
```

Test:

- Public homepage and event/blog pages
- Admin login at `{admin.path}/login`
- Event create/edit with image upload
- Blog post create/edit (if enabled)
