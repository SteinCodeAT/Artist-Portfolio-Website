import { validateTableBlockFields } from '@steincms/cms/blocks/table-block';
import { sanitizeHtml } from '@steincms/cms/core/sanitize-html';
import { isMediaUrl, type MediaConfig } from '@steincms/cms/media/media-store';
import {
	parseRegistrationForm,
	type EventRegistrationForm,
} from './registration-form.ts';

export type {
	EventRegistrationForm,
	RegistrationField,
	RegistrationFieldOption,
	RegistrationFieldType,
} from './registration-form.ts';

export type EventTextBlock = {
	id: string;
	type: 'text';
	html: string;
};

export type EventImageBlock = {
	id: string;
	type: 'image';
	url: string;
	alt: string;
	caption?: string;
};

export type EventTableBlock = {
	id: string;
	type: 'table';
	hasHeaderRow: boolean;
	rows: string[][];
};

export type EventContentBlock = EventTextBlock | EventImageBlock | EventTableBlock;

export type EventPreviewDraft = {
	title: string;
	excerpt: string;
	cover: string | null;
	date: string | null;
	category: string;
	location?: string | null;
	blocks: EventContentBlock[];
	gallery: string[];
	registrationForm?: EventRegistrationForm;
	updatedAt: string;
};

export type EventFormInput = {
	title: string;
	excerpt?: string;
	cover?: string | null;
	date: string | null;
	category: string;
	location?: string | null;
	blocks: EventContentBlock[];
	gallery: string[];
	registrationForm?: EventRegistrationForm;
};

export function buildPreviewDraft(input: EventFormInput): EventPreviewDraft {
	return {
		title: input.title.trim(),
		excerpt: (input.excerpt ?? '').trim(),
		cover: input.cover ?? null,
		date: input.date,
		category: input.category,
		location: input.location ?? null,
		blocks: input.blocks,
		gallery: input.gallery,
		registrationForm: parseRegistrationForm(input.registrationForm),
		updatedAt: new Date().toISOString(),
	};
}

function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>\s*<p>/gi, '\n')
		.replace(/<\/li>\s*<li[^>]*>/gi, '\n')
		.replace(/<\/?(?:ul|ol|li|p|div|h[1-6]|span)[^>]*>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.trim();
}

/** Derive legacy body[] lines from text blocks for backward compatibility. */
export function eventContentBlocksToBody(blocks: EventContentBlock[]): string[] {
	return blocks
		.filter((block): block is EventTextBlock => block.type === 'text')
		.flatMap((block) =>
			stripHtml(block.html)
				.split(/\n+/)
				.map((line) => line.trim())
				.filter(Boolean),
		);
}

export function validateEventContentBlocks(
	raw: unknown,
	mediaConfig: MediaConfig,
): EventContentBlock[] {
	if (raw === undefined || raw === null) {
		return [];
	}
	if (!Array.isArray(raw)) {
		throw new Error('blocks must be an array');
	}

	return raw.map((item, index) => {
		if (!item || typeof item !== 'object') {
			throw new Error(`Block ${index + 1} is invalid`);
		}

		const block = item as Record<string, unknown>;
		const id = String(block.id ?? '').trim();
		const type = String(block.type ?? '').trim();

		if (!id) {
			throw new Error(`Block ${index + 1} is missing an id`);
		}

		if (type === 'gallery') {
			throw new Error(`Block ${index + 1}: gallery blocks belong in gallery[], not blocks[]`);
		}

		if (type === 'text') {
			const html = sanitizeHtml(String(block.html ?? ''));
			return { id, type: 'text', html } satisfies EventTextBlock;
		}

		if (type === 'image') {
			const url = String(block.url ?? '').trim();
			const alt = String(block.alt ?? '').trim();
			const captionRaw = block.caption;
			const caption =
				captionRaw === undefined || captionRaw === null
					? undefined
					: String(captionRaw).trim();

			if (!url || !isMediaUrl(url, mediaConfig)) {
				throw new Error(`Block ${index + 1}: invalid image URL`);
			}
			if (!alt) {
				throw new Error(`Block ${index + 1}: alt text is required`);
			}

			return {
				id,
				type: 'image',
				url,
				alt,
				...(caption ? { caption } : {}),
			} satisfies EventImageBlock;
		}

		if (type === 'table') {
			const tableFields = validateTableBlockFields(block, index);
			return { id, type: 'table', ...tableFields } satisfies EventTableBlock;
		}

		throw new Error(`Block ${index + 1}: unknown type "${type}"`);
	});
}
