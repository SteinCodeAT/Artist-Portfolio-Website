const THUMB_RETRY_DELAY_MS = 1000;
const THUMB_RETRY_ATTEMPTS = 3;

function withCacheBust(url: string): string {
	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}t=${Date.now()}`;
}

function tryLoadImage(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve();
		image.onerror = () => reject(new Error('thumb unavailable'));
		image.src = url;
	});
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function galleryProcessingIconHtml(): string {
	const template = document.querySelector(
		'[data-gallery-processing-icon]',
	) as HTMLTemplateElement | null;
	return template?.innerHTML.trim() ?? '';
}

/**
 * Wait until a newly written thumb is actually serveable.
 * Returns a display URL (possibly cache-busted). Never put the result in saved data.
 */
export async function previewThumbUrl(thumbUrl: string): Promise<string> {
	try {
		await tryLoadImage(thumbUrl);
		return thumbUrl;
	} catch {
		/* retry with a cache-bust so a cached 404 is not reused */
	}

	let lastUrl = thumbUrl;
	for (let attempt = 0; attempt < THUMB_RETRY_ATTEMPTS; attempt++) {
		await delay(THUMB_RETRY_DELAY_MS);
		lastUrl = withCacheBust(thumbUrl);
		try {
			await tryLoadImage(lastUrl);
			return lastUrl;
		} catch {
			/* try again */
		}
	}

	return lastUrl;
}
