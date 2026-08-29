import fs from 'node:fs';
import path from 'node:path';
import { iterateCollections, type ContentSchemaRegistry } from '@steincms/cms/schema';
import { requireTable, SINGLETONS_TABLE, type CmsDatabase } from '@steincms/cms/storage/db-contract';
import { isMediaUrl, type MediaConfig } from './media-store.ts';

const THUMB_SUFFIX = '-thumb.webp';
const WEBP_EXT = '.webp';

export type PruneOrphansOptions = {
	mediaConfig: MediaConfig;
	contentSchema: ContentSchemaRegistry;
	database: CmsDatabase;
	apply?: boolean;
	includeDrafts?: boolean;
};

export type PruneOrphansResult = {
	referencedUrls: number;
	scannedFiles: number;
	orphans: string[];
	emptyDirs: string[];
	applied: boolean;
};

/**
 * Referenced media URLs are read straight out of the database — the live
 * source of truth for events/posts/singletons — never from the pre-DB JSON
 * files, which would be stale (or absent) and make this look like nothing
 * is referenced.
 */
export function collectReferencedMediaUrls(
	contentSchema: ContentSchemaRegistry,
	database: CmsDatabase,
	mediaConfig: MediaConfig,
): Set<string> {
	const urls = new Set<string>();

	for (const collection of iterateCollections(contentSchema)) {
		if (collection.kind !== 'list') {
			continue;
		}
		const table = requireTable(database, collection.id);
		const rows = database.open().select().from(table).all();
		for (const row of rows) {
			collectFromValue(row, mediaConfig, urls);
		}
	}

	const singletonsTable = requireTable(database, SINGLETONS_TABLE);
	const singletonRows = database.open().select().from(singletonsTable).all() as { data: unknown }[];
	for (const row of singletonRows) {
		collectFromValue(row.data, mediaConfig, urls);
	}

	return urls;
}

export function pruneOrphanMedia(options: PruneOrphansOptions): PruneOrphansResult {
	const { mediaConfig, contentSchema, database } = options;
	const apply = Boolean(options.apply);
	const includeDrafts = Boolean(options.includeDrafts);

	const referenced = collectReferencedMediaUrls(contentSchema, database, mediaConfig);
	const files = listMediaFiles(mediaConfig.root, includeDrafts, mediaConfig.draftPrefix);

	const orphans: string[] = [];
	const keptFiles: string[] = [];

	for (const filePath of files) {
		const url = filePathToMediaUrl(filePath, mediaConfig);
		if (url && shouldKeepFile(url, referenced)) {
			keptFiles.push(filePath);
		} else {
			orphans.push(filePath);
		}
	}

	orphans.sort(comparePosix);

	if (apply) {
		for (const filePath of orphans) {
			fs.rmSync(filePath, { force: true });
		}
	}

	const emptyDirs = apply
		? removeEmptyDirs(mediaConfig.root, includeDrafts, mediaConfig.draftPrefix)
		: dirsThatWouldBeEmpty(
				mediaConfig.root,
				keptFiles,
				includeDrafts,
				mediaConfig.draftPrefix,
			);

	return {
		referencedUrls: referenced.size,
		scannedFiles: files.length,
		orphans,
		emptyDirs,
		applied: apply,
	};
}

function collectFromValue(value: unknown, mediaConfig: MediaConfig, urls: Set<string>): void {
	if (typeof value === 'string') {
		const url = normalizeMediaUrl(value, mediaConfig);
		if (url) {
			urls.add(url);
		}
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			collectFromValue(item, mediaConfig, urls);
		}
		return;
	}

	if (value && typeof value === 'object') {
		for (const nested of Object.values(value)) {
			collectFromValue(nested, mediaConfig, urls);
		}
	}
}

function normalizeMediaUrl(value: string, mediaConfig: MediaConfig): string | null {
	const trimmed = value.trim().split(/[?#]/, 1)[0];
	if (!trimmed || !isMediaUrl(trimmed, mediaConfig)) {
		return null;
	}
	return trimmed;
}

function shouldKeepFile(url: string, referenced: Set<string>): boolean {
	if (referenced.has(url)) {
		return true;
	}
	const mainUrl = mainUrlForThumb(url);
	return mainUrl != null && referenced.has(mainUrl);
}

function mainUrlForThumb(url: string): string | null {
	if (!url.endsWith(THUMB_SUFFIX)) {
		return null;
	}
	return `${url.slice(0, -THUMB_SUFFIX.length)}${WEBP_EXT}`;
}

function filePathToMediaUrl(filePath: string, mediaConfig: MediaConfig): string | null {
	const relative = path.relative(mediaConfig.root, filePath);
	if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
		return null;
	}
	const posix = toPosix(relative);
	if (posix.includes('..')) {
		return null;
	}
	return `${mediaConfig.urlPrefix}/${posix}`;
}

function listMediaFiles(root: string, includeDrafts: boolean, draftPrefix: string): string[] {
	if (!fs.existsSync(root)) {
		return [];
	}

	const files: string[] = [];
	walkDir(root, root, includeDrafts, draftPrefix, (fullPath, dirent) => {
		if (dirent.isFile()) {
			files.push(fullPath);
		}
	});
	return files;
}

function walkDir(
	root: string,
	dir: string,
	includeDrafts: boolean,
	draftPrefix: string,
	visit: (fullPath: string, dirent: fs.Dirent) => void,
): void {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (isSkippedDraftDir(root, dir, entry, includeDrafts, draftPrefix)) {
			continue;
		}
		const fullPath = path.join(dir, entry.name);
		visit(fullPath, entry);
		if (entry.isDirectory()) {
			walkDir(root, fullPath, includeDrafts, draftPrefix, visit);
		}
	}
}

function isSkippedDraftDir(
	root: string,
	dir: string,
	entry: fs.Dirent,
	includeDrafts: boolean,
	draftPrefix: string,
): boolean {
	return (
		!includeDrafts &&
		entry.isDirectory() &&
		dir === root &&
		entry.name === draftPrefix
	);
}

function removeEmptyDirs(root: string, includeDrafts: boolean, draftPrefix: string): string[] {
	if (!fs.existsSync(root)) {
		return [];
	}

	const removed: string[] = [];
	removeEmptyDirsRecursive(root, root, includeDrafts, draftPrefix, removed);
	removed.sort(comparePosix);
	return removed;
}

function removeEmptyDirsRecursive(
	root: string,
	dir: string,
	includeDrafts: boolean,
	draftPrefix: string,
	removed: string[],
): void {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (isSkippedDraftDir(root, dir, entry, includeDrafts, draftPrefix)) {
			continue;
		}
		if (entry.isDirectory()) {
			removeEmptyDirsRecursive(root, path.join(dir, entry.name), includeDrafts, draftPrefix, removed);
		}
	}

	if (dir === root) {
		return;
	}

	try {
		if (fs.readdirSync(dir).length === 0) {
			fs.rmdirSync(dir);
			removed.push(dir);
		}
	} catch {
		/* ignore dirs that cannot be removed */
	}
}

function dirsThatWouldBeEmpty(
	root: string,
	keptFiles: string[],
	includeDrafts: boolean,
	draftPrefix: string,
): string[] {
	if (!fs.existsSync(root)) {
		return [];
	}

	const dirs: string[] = [];
	walkDir(root, root, includeDrafts, draftPrefix, (fullPath, dirent) => {
		if (dirent.isDirectory()) {
			dirs.push(fullPath);
		}
	});

	const empty = dirs.filter((dir) => !keptFiles.some((file) => isInsideDir(dir, file)));
	empty.sort(comparePosix);
	return empty;
}

function isInsideDir(dir: string, filePath: string): boolean {
	const relative = path.relative(dir, filePath);
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function toPosix(relativePath: string): string {
	return relativePath.split(path.sep).join('/');
}

function comparePosix(a: string, b: string): number {
	return toPosix(a).localeCompare(toPosix(b));
}
