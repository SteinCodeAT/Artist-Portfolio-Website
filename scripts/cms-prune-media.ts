import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iterateCollections } from '@steincms/cms/schema';
import { createMediaConfig } from '@steincms/cms/media/media-store';
import { pruneOrphanMedia } from '@steincms/cms/media/prune-orphans';
import { contentSchema } from '../src/content.schema.ts';
import { cmsDatabase } from '../src/db/cms-database.ts';
import { siteConfig } from '../src/site.config.ts';

const DEFAULT_MIN_AGE_DAYS = 7;

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apply = process.argv.includes('--apply');
const includeDrafts = process.argv.includes('--include-drafts');
const minAgeDays = parseMinAgeDays(process.argv);
const databasePath =
	process.env.DATABASE_URL ?? './data/admin_cms.sqlite';

const configuredRoot = process.env.MEDIA_ROOT ?? siteConfig.media.root;
const mediaConfig = createMediaConfig({
	...siteConfig.media,
	root: path.isAbsolute(configuredRoot) ? configuredRoot : path.resolve(projectRoot, configuredRoot),
});

const collections = iterateCollections(contentSchema);

console.log(`CMS prune media${apply ? '' : ' (dry run)'}\n`);
console.log(`  Media root:  ${mediaConfig.root}`);
console.log(`  Database:    ${databasePath}`);
console.log(`  Collections: ${collections.map((collection) => collection.id).join(', ')}`);
console.log(`  Min age:     ${minAgeDays} day${minAgeDays === 1 ? '' : 's'}${minAgeDays === 0 ? ' (no age filter)' : ''}`);
if (includeDrafts) {
	console.log('  Drafts:      included');
}
console.log('');

const result = pruneOrphanMedia({
	mediaConfig,
	contentSchema,
	database: cmsDatabase,
	apply,
	includeDrafts,
	minAgeDays,
});

console.log(`  Referenced URLs: ${result.referencedUrls}`);
console.log(`  Files on disk:   ${result.scannedFiles}`);
console.log(`  Orphans:         ${result.orphans.length}`);
console.log(`  Too new:         ${result.skippedYoung.length}`);
console.log(`  Empty dirs:      ${result.emptyDirs.length}`);
console.log('');

const verbFile = apply ? 'deleted' : 'would delete';
const verbDir = apply ? 'removed dir' : 'would remove dir';
const verbYoung = 'too new';

for (const filePath of result.orphans) {
	console.log(`  ${verbFile.padEnd(16)}  ${displayPath(filePath, mediaConfig.root)}`);
}

for (const filePath of result.skippedYoung) {
	console.log(`  ${verbYoung.padEnd(16)}  ${displayPath(filePath, mediaConfig.root)}`);
}

for (const dirPath of result.emptyDirs) {
	console.log(`  ${verbDir.padEnd(16)}  ${displayPath(dirPath, mediaConfig.root)}/`);
}

if (result.orphans.length === 0 && result.emptyDirs.length === 0 && result.skippedYoung.length === 0) {
	console.log('  No orphan media files.');
}

const fileLabel = result.orphans.length === 1 ? 'file' : 'files';
const dirLabel = result.emptyDirs.length === 1 ? 'dir' : 'dirs';
const youngLabel = result.skippedYoung.length === 1 ? 'file' : 'files';
const action = apply ? 'deleted' : 'would be deleted';
const youngNote =
	result.skippedYoung.length > 0
		? `, ${result.skippedYoung.length} unused ${youngLabel} kept (younger than ${minAgeDays} day${minAgeDays === 1 ? '' : 's'})`
		: '';
console.log(
	`\nDone. ${result.orphans.length} ${fileLabel} ${action}` +
		(result.emptyDirs.length > 0 ? `, ${result.emptyDirs.length} empty ${dirLabel} ${apply ? 'removed' : 'would be removed'}` : '') +
		youngNote +
		'.',
);

if (!apply && (result.orphans.length > 0 || result.emptyDirs.length > 0)) {
	console.log('Re-run with --apply to delete.');
}

function parseMinAgeDays(argv: string[]): number {
	const eq = argv.find((arg) => arg.startsWith('--min-age-days='));
	const raw = eq
		? eq.slice('--min-age-days='.length)
		: (() => {
				const index = argv.indexOf('--min-age-days');
				return index >= 0 ? argv[index + 1] : undefined;
			})();

	if (raw == null || raw === '') {
		return DEFAULT_MIN_AGE_DAYS;
	}

	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
		throw new Error(`Invalid --min-age-days value: ${raw}`);
	}
	return parsed;
}

function displayPath(absolutePath: string, mediaRoot: string): string {
	const relative = path.relative(mediaRoot, absolutePath);
	return relative.split(path.sep).join('/');
}
