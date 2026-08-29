import fs from 'node:fs';
import path from 'node:path';

export type MediaContentType = 'events' | 'posts';

export type MediaConfig = {
	root: string;
	urlPrefix: string;
	draftPrefix: string;
};

function resolveMediaRoot(root: string): string {
	return path.isAbsolute(root) ? root : path.join(process.cwd(), root);
}

export function createMediaConfig(config: {
	root?: string;
	urlPrefix?: string;
	draftPrefix?: string;
}): MediaConfig {
	return {
		root: resolveMediaRoot(config.root ?? 'public/media'),
		urlPrefix: config.urlPrefix ?? '/media',
		draftPrefix: config.draftPrefix ?? '_drafts',
	};
}

export function entryDir(config: MediaConfig, type: MediaContentType, entryId: string): string {
	return path.join(config.root, type, entryId);
}

export function draftDir(config: MediaConfig, draftId: string): string {
	return path.join(config.root, config.draftPrefix, draftId);
}

export function mediaUrl(
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
	filename: string,
): string {
	return `${config.urlPrefix}/${type}/${entryId}/${filename}`;
}

export function mediaFilePath(
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
	filename: string,
): string {
	return path.join(entryDir(config, type, entryId), filename);
}

export function ensureEntryDir(config: MediaConfig, type: MediaContentType, entryId: string): string {
	const dir = entryDir(config, type, entryId);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

export function deleteEntryMedia(
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
): void {
	const dir = entryDir(config, type, entryId);
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

export function moveDraftToEntry(
	config: MediaConfig,
	type: MediaContentType,
	draftId: string,
	entryId: string,
): void {
	const from = draftDir(config, draftId);
	const to = entryDir(config, type, entryId);
	if (!fs.existsSync(from)) {
		return;
	}
	fs.mkdirSync(path.dirname(to), { recursive: true });
	if (fs.existsSync(to)) {
		fs.rmSync(to, { recursive: true, force: true });
	}
	fs.renameSync(from, to);
}

export function cleanupStaleDrafts(config: MediaConfig, maxAgeMs = 24 * 60 * 60 * 1000): void {
	const draftsRoot = path.join(config.root, config.draftPrefix);
	if (!fs.existsSync(draftsRoot)) {
		return;
	}

	const cutoff = Date.now() - maxAgeMs;
	for (const name of fs.readdirSync(draftsRoot)) {
		const dir = path.join(draftsRoot, name);
		try {
			const stat = fs.statSync(dir);
			if (stat.isDirectory() && stat.mtimeMs < cutoff) {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		} catch {
			/* ignore per-entry cleanup errors */
		}
	}
}

/** Resolve cover/gallery URLs — supports legacy relative filenames after migration. */
export function resolveMediaUrl(
	value: string | null | undefined,
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
): string | null {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}
	if (trimmed.startsWith('/')) {
		const prefix = `${config.urlPrefix}/${type}/`;
		if (trimmed.startsWith(prefix)) {
			const folder = trimmed.slice(prefix.length).split('/')[0];
			if (folder && folder !== entryId) {
				return null;
			}
		}
		return trimmed;
	}
	if (trimmed.includes('..')) {
		return null;
	}
	const filename = trimmed.includes('/') ? trimmed.split('/').pop()! : trimmed;
	if (filename === 'cover.webp' || /^\d{2}(-thumb)?\.webp$/.test(filename)) {
		return mediaUrl(config, type, entryId, filename);
	}
	return mediaUrl(config, type, entryId, filename);
}

export function resolveGalleryUrls(
	gallery: string[],
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
): string[] {
	return gallery
		.map((item) => resolveMediaUrl(item, config, type, entryId))
		.filter((url): url is string => url != null);
}

export function isMediaUrl(url: string, config: MediaConfig): boolean {
	return url.startsWith(`${config.urlPrefix}/`) && !url.includes('..');
}
