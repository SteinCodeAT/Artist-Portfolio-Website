This shared folder is shared across projects and therefore READ-ONLY.

NEVER edit them here or risk a drift between the copies in each repository.

This code is manually copied from the central steincms-repository.

Public contract:

- `@steincms/cms/schema` — define records and collections
- `@steincms/cms/create-cms` — `createCms({ siteConfig, contentSchema })`
- `@steincms/astro/cms-integration` — version gate + CMS API `injectRoute`
- `@steincms/auth/create-middleware`
- `@steincms/admin/components/*` — compose these from site admin pages
- `@steincms/cms/forms/RegistrationForm.astro` — event registration shell (token, Turnstile, submit)
- `@steincms/cms/forms/RegistrationFieldList.astro` — default name / email / guests / custom questions
- `@steincms/cms/forms/RegistrationField.astro` — one custom question (`field` prop)
- `@steincms/api/handlers/*` — used by injected routes; call from `createCms`
- `@steincms/cms/storage/db-contract` — the `CmsDatabase`/`DatabaseConnection` contract every project's real Drizzle client is cast to
- `@steincms/db/generate-schemas` — codegen entry point behind `npm run db:sync-schema`

See `NEW-SITE.md`, `DATABASE.md`, and `CHANGELOG.md`.
