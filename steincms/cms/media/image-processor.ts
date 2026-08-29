import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
	ensureEntryDir,
	mediaFilePath,
	mediaUrl,
	type MediaConfig,
	type MediaContentType,
} from './media-store.ts';

export type ImagePreset = 'cover' | 'gallery' | 'thumb' | 'block';

const PRESETS: Record<ImagePreset, { width: number; quality: number; ext: '.webp' }> = {
	cover: { width: 720, quality: 70, ext: '.webp' },
	gallery: { width: 960, quality: 65, ext: '.webp' },
	thumb: { width: 480, quality: 80, ext: '.webp' },
	block: { width: 960, quality: 75, ext: '.webp' },
};

export type ProcessedMedia = {
	url: string;
	thumbUrl: string;
	width: number;
	height: number;
};

export const ALLOWED_MIME: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
};

function thumbFilename(filename: string): string {
	const ext = path.extname(filename);
	const base = filename.slice(0, -ext.length);
	return `${base}-thumb.webp`;
}

export async function processImageToSlot(
	buffer: Buffer,
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
	filename: string,
	preset: ImagePreset = 'gallery',
): Promise<ProcessedMedia> {
	ensureEntryDir(config, type, entryId);
	const destPath = mediaFilePath(config, type, entryId, filename);
	const thumbName = thumbFilename(filename);
	const thumbPath = mediaFilePath(config, type, entryId, thumbName);
	const { width, quality } = PRESETS[preset];

	const meta = await sharp(buffer).metadata();
	await sharp(buffer)
		.resize({ width, withoutEnlargement: true })
		.webp({ quality })
		.toFile(destPath);

	await sharp(buffer)
		.resize({ width: PRESETS.thumb.width, withoutEnlargement: true })
		.webp({ quality: PRESETS.thumb.quality })
		.toFile(thumbPath);

	return {
		url: mediaUrl(config, type, entryId, filename),
		thumbUrl: mediaUrl(config, type, entryId, thumbName),
		width: meta.width ?? width,
		height: meta.height ?? width,
	};
}

export async function processUploadedImage(
	buffer: Buffer,
	mime: string,
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
	slot: string,
	preset: ImagePreset = 'gallery',
): Promise<ProcessedMedia> {
	if (!(mime in ALLOWED_MIME)) {
		throw new Error('Ungültiger Dateityp');
	}

	const filename = slot.endsWith('.webp') ? slot : `${slot}.webp`;
	return processImageToSlot(buffer, config, type, entryId, filename, preset);
}

export function nextGallerySlot(existingUrls: string[]): string {
	const used = new Set<number>();
	for (const url of existingUrls) {
		const match = url.match(/\/(\d{2})(?:-thumb)?\.webp$/);
		if (match) {
			used.add(Number.parseInt(match[1], 10));
		}
	}
	let index = 1;
	while (used.has(index)) {
		index += 1;
	}
	return `${String(index).padStart(2, '0')}.webp`;
}

/** Copy legacy file from disk into media slot (migration helper). */
export async function importFileToSlot(
	sourcePath: string,
	config: MediaConfig,
	type: MediaContentType,
	entryId: string,
	filename: string,
	preset: ImagePreset,
): Promise<ProcessedMedia> {
	if (!fs.existsSync(sourcePath)) {
		throw new Error(`Source file not found: ${sourcePath}`);
	}
	const buffer = fs.readFileSync(sourcePath);
	return processImageToSlot(buffer, config, type, entryId, filename, preset);
}
