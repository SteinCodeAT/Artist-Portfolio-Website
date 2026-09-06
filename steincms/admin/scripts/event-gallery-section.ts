/**
 * Fixed gallery section — separate from article blocks.
 * Events: maps to event.gallery[]. Projects: maps to post.mainGallery[].
 */

import { uploadImages } from './content-section-of-post-editor.ts';
import { galleryProcessingIconHtml, previewThumbUrl } from './gallery-thumb-preview.ts';

type GalleryImageEntry = {
	id: string;
	url: string;
	thumbUrl: string;
	previewSrc?: string;
	alt?: string;
	processing?: boolean;
};

export type FixedGallerySectionOptions = {
	contentType: 'events' | 'posts';
	entryIdDatasetKey?: string;
	gridSelector?: string;
	filesSelector?: string;
	uploadSelector?: string;
	emptyLabel?: string;
	uploadLabel?: string;
	uploadingLabel?: string;
	uploadFailedLabel?: string;
	processingLabel?: string;
};

const DEFAULTS: Required<Omit<FixedGallerySectionOptions, 'contentType'>> = {
	entryIdDatasetKey: 'eventId',
	gridSelector: '[data-event-gallery-grid]',
	filesSelector: '[data-event-gallery-files]',
	uploadSelector: '[data-event-gallery-upload]',
	emptyLabel: 'Noch keine Bilder — unten hochladen',
	uploadLabel: 'Bilder hochladen',
	uploadingLabel: 'Wird hochgeladen…',
	uploadFailedLabel: 'Upload fehlgeschlagen',
	processingLabel: 'Bild wird verarbeitet…',
};

function newImageId(): string {
	return `gi${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function urlToThumb(url: string): string {
	return url.includes('-thumb') ? url : url.replace(/\.webp$/, '-thumb.webp');
}

function urlsToImages(urls: string[]): GalleryImageEntry[] {
	return urls.map((url, index) => ({
		id: `gi${index}-${url.slice(-8)}`,
		url,
		thumbUrl: urlToThumb(url),
		alt: '',
	}));
}

function renderGalleryGrid(
	images: GalleryImageEntry[],
	emptyLabel: string,
	processingLabel: string,
): string {
	if (images.length === 0) {
		return `<p class="block-gallery-empty">${escapeHtml(emptyLabel)}</p>`;
	}

	return images
		.map((image) => {
			if (image.processing) {
				return `
        <div class="block-gallery-item block-gallery-item--processing" data-gallery-image-id="${escapeHtml(image.id)}">
          <div class="block-gallery-thumb block-gallery-thumb--processing" role="status">
            ${galleryProcessingIconHtml()}
            <span>${escapeHtml(processingLabel)}</span>
          </div>
        </div>
      `;
			}

			return `
        <div class="block-gallery-item" data-gallery-image-id="${escapeHtml(image.id)}">
          <img src="${escapeHtml(image.previewSrc ?? image.thumbUrl)}" alt="" class="block-gallery-thumb" />
          <label class="block-field block-gallery-alt">
            <span>Alt-Text (optional)</span>
            <input type="text" data-gallery-alt value="${escapeHtml(image.alt ?? '')}" />
          </label>
          <button type="button" class="block-btn block-btn-danger block-gallery-remove" title="Bild entfernen">✕</button>
        </div>
      `;
		})
		.join('');
}

export function initEventGallerySection(
	root: HTMLElement,
	initialUrls: string[],
	options: FixedGallerySectionOptions = { contentType: 'events' },
): { getGalleryUrls: () => string[] } {
	const settings = { ...DEFAULTS, ...options };
	let images: GalleryImageEntry[] = urlsToImages(initialUrls);
	const gridEl = root.querySelector(settings.gridSelector) as HTMLElement | null;
	const fileInput = root.querySelector(settings.filesSelector) as HTMLInputElement | null;
	const uploadBtn = root.querySelector(settings.uploadSelector) as HTMLButtonElement | null;

	if (!gridEl) {
		throw new Error(`${settings.gridSelector} not found`);
	}

	const uploadContext = (): { contentType: 'events' | 'posts'; entryId: string } | undefined => {
		const entryId = root.dataset[settings.entryIdDatasetKey] || undefined;
		if (!entryId) return undefined;
		return { contentType: options.contentType, entryId };
	};

	let uploading = false;

	function bindGridEvents(): void {
		gridEl!.querySelectorAll('[data-gallery-image-id]').forEach((itemEl) => {
			const imageId = itemEl.getAttribute('data-gallery-image-id');
			if (!imageId) return;

			const image = images.find((entry) => entry.id === imageId);
			if (!image || image.processing) return;

			const altInput = itemEl.querySelector('[data-gallery-alt]') as HTMLInputElement | null;
			altInput?.addEventListener('input', () => {
				image.alt = altInput.value;
			});

			itemEl.querySelector('.block-gallery-remove')?.addEventListener('click', () => {
				images = images.filter((entry) => entry.id !== imageId);
				render();
			});
		});
	}

	function render(): void {
		gridEl!.innerHTML = renderGalleryGrid(
			images,
			settings.emptyLabel,
			settings.processingLabel,
		);
		bindGridEvents();
		if (uploadBtn) {
			uploadBtn.textContent = uploading ? settings.uploadingLabel : settings.uploadLabel;
			uploadBtn.disabled = uploading;
		}
	}

	uploadBtn?.addEventListener('click', () => fileInput?.click());

	fileInput?.addEventListener('change', async () => {
		const selected = fileInput.files ? Array.from(fileInput.files) : [];
		fileInput.value = '';
		if (selected.length === 0) return;

		uploading = true;
		const pending = selected.map(() => {
			const entry: GalleryImageEntry = {
				id: newImageId(),
				url: '',
				thumbUrl: '',
				processing: true,
			};
			images.push(entry);
			return entry;
		});
		render();

		try {
			const uploaded = await uploadImages(selected, uploadContext());
			await Promise.all(
				uploaded.map(async (result, index) => {
					const entry = pending[index];
					if (!entry) return;
					entry.url = result.url;
					entry.thumbUrl = result.thumbUrl;
					entry.previewSrc = await previewThumbUrl(result.thumbUrl);
					entry.processing = false;
					render();
				}),
			);
			for (const entry of pending) {
				if (entry.processing) {
					images = images.filter((image) => image.id !== entry.id);
				}
			}
		} catch (error) {
			images = images.filter((image) => !pending.some((entry) => entry.id === image.id));
			alert(error instanceof Error ? error.message : settings.uploadFailedLabel);
		} finally {
			uploading = false;
			render();
		}
	});

	render();

	return {
		getGalleryUrls: () =>
			images.filter((image) => !image.processing && image.url).map((image) => image.url),
	};
}

export {};
