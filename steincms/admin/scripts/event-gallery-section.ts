/**
 * Fixed Veranstaltungsbilder gallery section for the event editor.
 * Separate from article blocks — maps to event.gallery[] on save.
 */

import { uploadImages } from './content-section-of-post-editor.ts';

type GalleryImageEntry = {
	id: string;
	url: string;
	thumbUrl: string;
	alt?: string;
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

function renderGalleryGrid(images: GalleryImageEntry[]): string {
	if (images.length === 0) {
		return '<p class="block-gallery-empty">Noch keine Bilder — unten hochladen</p>';
	}

	return images
		.map(
			(image) => `
        <div class="block-gallery-item" data-gallery-image-id="${escapeHtml(image.id)}">
          <img src="${escapeHtml(image.thumbUrl)}" alt="" class="block-gallery-thumb" />
          <label class="block-field block-gallery-alt">
            <span>Alt-Text (optional)</span>
            <input type="text" data-gallery-alt value="${escapeHtml(image.alt ?? '')}" />
          </label>
          <button type="button" class="block-btn block-btn-danger block-gallery-remove" title="Bild entfernen">✕</button>
        </div>
      `,
		)
		.join('');
}

export function initEventGallerySection(
	root: HTMLElement,
	initialUrls: string[],
): { getGalleryUrls: () => string[] } {
	let images: GalleryImageEntry[] = urlsToImages(initialUrls);
	const gridEl = root.querySelector('[data-event-gallery-grid]') as HTMLElement | null;
	const fileInput = root.querySelector('[data-event-gallery-files]') as HTMLInputElement | null;
	const uploadBtn = root.querySelector('[data-event-gallery-upload]') as HTMLButtonElement | null;

	if (!gridEl) {
		throw new Error('[data-event-gallery-grid] not found');
	}

	const uploadContext = (): { contentType: 'events'; entryId: string } | undefined => {
		const entryId = root.dataset.eventId || undefined;
		if (!entryId) return undefined;
		return { contentType: 'events', entryId };
	};

	function bindGridEvents(): void {
		gridEl!.querySelectorAll('[data-gallery-image-id]').forEach((itemEl) => {
			const imageId = itemEl.getAttribute('data-gallery-image-id');
			if (!imageId) return;

			const image = images.find((entry) => entry.id === imageId);
			if (!image) return;

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
		gridEl!.innerHTML = renderGalleryGrid(images);
		bindGridEvents();
		if (uploadBtn) {
			uploadBtn.textContent = 'Bilder hochladen';
			uploadBtn.disabled = false;
		}
	}

	uploadBtn?.addEventListener('click', () => fileInput?.click());

	fileInput?.addEventListener('change', async () => {
		const selected = fileInput.files ? Array.from(fileInput.files) : [];
		fileInput.value = '';
		if (selected.length === 0) return;

		if (uploadBtn) {
			uploadBtn.textContent = 'Wird hochgeladen…';
			uploadBtn.disabled = true;
		}

		try {
			const uploaded = await uploadImages(selected, uploadContext());
			for (const result of uploaded) {
				images.push({
					id: newImageId(),
					url: result.url,
					thumbUrl: result.thumbUrl,
				});
			}
			render();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
			if (uploadBtn) {
				uploadBtn.textContent = 'Bilder hochladen';
				uploadBtn.disabled = false;
			}
		}
	});

	render();

	return {
		getGalleryUrls: () => images.map((image) => image.url),
	};
}

export {};
