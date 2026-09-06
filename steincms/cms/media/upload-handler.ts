import { createUuidV7 } from '@steincms/cms/core/uuid';
import type { MediaConfig, MediaContentType } from './media-store.ts';
import { ALLOWED_MIME, processUploadedImage, type ImagePreset } from './image-processor.ts';

export type UploadImageInput = {
	buffer: Buffer;
	mime: string;
	contentType: MediaContentType;
	entryId: string;
	slot: string;
	preset?: ImagePreset;
};

function isCoverSlot(slot: string): boolean {
	return slot === 'cover' || slot === 'cover.webp' || /_cover(?:\.webp)?$/.test(slot);
}

/** Generic cover requests get a unique file so drafts do not overwrite the live image. */
function resolveUploadSlot(slot: string): string {
	if (slot === 'cover' || slot === 'cover.webp') {
		return `${createUuidV7()}_cover.webp`;
	}
	return slot;
}

export async function handleImageUpload(
	config: MediaConfig,
	input: UploadImageInput,
): Promise<{ url: string; thumbUrl: string; width: number; height: number }> {
	if (!(input.mime in ALLOWED_MIME)) {
		throw new Error('Ungültiger Dateityp');
	}

	const slot = resolveUploadSlot(input.slot);

	return processUploadedImage(
		input.buffer,
		input.mime,
		config,
		input.contentType,
		input.entryId,
		slot,
		input.preset ?? (isCoverSlot(input.slot) || isCoverSlot(slot) ? 'cover' : 'gallery'),
	);
}

export async function handleMultiImageUpload(
	config: MediaConfig,
	files: Array<{ buffer: Buffer; mime: string }>,
	contentType: MediaContentType,
	entryId: string,
	startSlot?: string,
): Promise<Array<{ url: string; thumbUrl: string }>> {
	const results: Array<{ url: string; thumbUrl: string }> = [];

	for (const file of files) {
		const slot =
			files.length === 1 && startSlot
				? startSlot
				: `${createUuidV7()}.webp`;
		const processed = await handleImageUpload(config, {
			buffer: file.buffer,
			mime: file.mime,
			contentType,
			entryId,
			slot,
		});
		results.push({ url: processed.url, thumbUrl: processed.thumbUrl });
	}

	return results;
}
