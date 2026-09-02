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

export async function handleImageUpload(
	config: MediaConfig,
	input: UploadImageInput,
): Promise<{ url: string; thumbUrl: string; width: number; height: number }> {
	if (!(input.mime in ALLOWED_MIME)) {
		throw new Error('Ungültiger Dateityp');
	}

	return processUploadedImage(
		input.buffer,
		input.mime,
		config,
		input.contentType,
		input.entryId,
		input.slot,
		input.preset ?? (input.slot === 'cover' ? 'cover' : 'gallery'),
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
	let slotIndex = startSlot ? Number.parseInt(startSlot, 10) : 1;

	for (const file of files) {
		const slot =
			files.length === 1 && startSlot
				? startSlot
				: `${String(slotIndex).padStart(2, '0')}.webp`;
		const processed = await handleImageUpload(config, {
			buffer: file.buffer,
			mime: file.mime,
			contentType,
			entryId,
			slot,
		});
		results.push({ url: processed.url, thumbUrl: processed.thumbUrl });
		if (!startSlot || files.length > 1) {
			slotIndex += 1;
		}
	}

	return results;
}
