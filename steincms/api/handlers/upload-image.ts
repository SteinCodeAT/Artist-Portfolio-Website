import type { APIRoute } from 'astro';
import { handleMultiImageUpload } from '@steincms/cms/media/upload-handler';
import type { MediaConfig } from '@steincms/cms/media/media-store';
import type { MediaContentType } from '@steincms/cms/media/media-store';
import { jsonResponse } from '@steincms/api/json-response';

export function createUploadImageHandler(mediaConfig: MediaConfig): APIRoute {
	return async ({ request }) => {
		try {
			const formData = await request.formData();
			const files = formData.getAll('file').filter((entry): entry is File => entry instanceof File);

			if (files.length === 0) {
				return jsonResponse({ error: 'Keine Datei übermittelt' }, 400);
			}

			const contentType = String(formData.get('contentType') ?? 'posts').trim() as MediaContentType;
			const entryId = String(formData.get('entryId') ?? '').trim();
			const slot = String(formData.get('slot') ?? '').trim();

			if (!entryId) {
				return jsonResponse({ error: 'entryId fehlt' }, 400);
			}

			if (contentType !== 'events' && contentType !== 'posts') {
				return jsonResponse({ error: 'Ungültiger contentType' }, 400);
			}

			const buffers: Array<{ buffer: Buffer; mime: string }> = [];
			for (const file of files) {
				const mime = file.type || 'application/octet-stream';
				const buffer = Buffer.from(await file.arrayBuffer());
				buffers.push({ buffer, mime });
			}

			const uploaded = await handleMultiImageUpload(
				mediaConfig,
				buffers,
				contentType,
				entryId,
				slot || undefined,
			);

			if (uploaded.length === 1) {
				return jsonResponse({ ok: true, ...uploaded[0] });
			}

			return jsonResponse({ ok: true, files: uploaded });
		} catch (error) {
			console.error('POST /api/upload-image failed:', error);
			return jsonResponse(
				{ error: error instanceof Error ? error.message : 'Upload fehlgeschlagen' },
				500,
			);
		}
	};
}
