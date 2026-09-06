import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iterateCollections } from '@steincms/cms/schema';
import { createMediaConfig } from '@steincms/cms/media/media-store';
import { pruneOrphanMedia } from '@steincms/cms/media/prune-orphans';
import { contentSchema } from '../src/content.schema.ts';
import { siteConfig } from '../src/site.config.ts';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apply = process.argv.includes('--apply');
const includeDrafts = process.argv.includes('--include-drafts');

const configuredRoot = process.env.MEDIA_ROOT ?? siteConfig.media.root;
const mediaConfig = createMediaConfig({
	...siteConfig.media,
	root: path.isAbsolute(configuredRoot) ? configuredRoot : path.resolve(projectRoot, configuredRoot),
});

const collections = iterateCollections(contentSchema);

console.log(`CMS prune media${apply ? '' : ' (dry run)'}\n`);
console.log(`  Media root:  ${mediaConfig.root}`);
console.log(`  Collections: ${collections.map((collection) => collection.id).join(', ')}`);
if (includeDrafts) {
	console.log('  Drafts:      included');
}
console.log('');

const result = pruneOrphanMedia({
	mediaConfig,
	contentSchema,
	projectRoot,
	apply,
	includeDrafts,
});

console.log(`  Referenced URLs: ${result.referencedUrls}`);
console.log(`  Files on disk:   ${result.scannedFiles}`);
console.log(`  Orphans:         ${result.orphans.length}`);
console.log(`  Empty dirs:      ${result.emptyDirs.length}`);
console.log('');

const verbFile = apply ? 'deleted' : 'would delete';
const verbDir = apply ? 'removed dir' : 'would remove dir';

for (const filePath of result.orphans) {
	console.log(`  ${verbFile.padEnd(16)}  ${displayPath(filePath, mediaConfig.root)}`);
}

for (const dirPath of result.emptyDirs) {
	console.log(`  ${verbDir.padEnd(16)}  ${displayPath(dirPath, mediaConfig.root)}/`);
}

if (result.orphans.length === 0 && result.emptyDirs.length === 0) {
	console.log('  No orphan media files.');
}

const fileLabel = result.orphans.length === 1 ? 'file' : 'files';
const dirLabel = result.emptyDirs.length === 1 ? 'dir' : 'dirs';
const action = apply ? 'deleted' : 'would be deleted';
console.log(
	`\nDone. ${result.orphans.length} ${fileLabel} ${action}` +
		(result.emptyDirs.length > 0 ? `, ${result.emptyDirs.length} empty ${dirLabel} ${apply ? 'removed' : 'would be removed'}` : '') +
		'.',
);

if (!apply && (result.orphans.length > 0 || result.emptyDirs.length > 0)) {
	console.log('Re-run with --apply to delete.');
}

function displayPath(absolutePath: string, mediaRoot: string): string {
	const relative = path.relative(mediaRoot, absolutePath);
	return relative.split(path.sep).join('/');
}
