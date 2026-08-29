import type { BlockData } from '@steincms/cms/blocks/editor-block';
import {
	createTableBlockFromFactLines,
	isFactLine,
} from '@steincms/cms/blocks/table-block';
import type { EventContentBlock, EventPreviewDraft, EventRegistrationForm } from './event-content-blocks';
import { parseRegistrationForm } from './registration-form.ts';

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Load body[] into editor blocks. Consecutive `Label: value` lines become one table block.
 */
export function eventBodyToBlocks(body: string[]): BlockData[] {
	const blocks: BlockData[] = [];
	let factLines: string[] = [];
	let blockIndex = 0;

	const flushFacts = () => {
		if (factLines.length === 0) return;
		blocks.push(createTableBlockFromFactLines(`b${blockIndex++}`, factLines));
		factLines = [];
	};

	for (const paragraph of body) {
		const line = paragraph.trim();
		if (!line) continue;
		if (isFactLine(line)) {
			factLines.push(line);
			continue;
		}
		flushFacts();
		blocks.push({
			id: `b${blockIndex++}`,
			type: 'text' as const,
			html: `<p>${escapeHtml(line)}</p>`,
		});
	}
	flushFacts();

	return blocks;
}

function storedBlockToEditorBlock(block: EventContentBlock): BlockData {
	if (block.type === 'text') {
		return { id: block.id, type: 'text', html: block.html };
	}
	if (block.type === 'table') {
		return {
			id: block.id,
			type: 'table',
			hasHeaderRow: block.hasHeaderRow,
			rows: block.rows.map((row) => [...row]),
		};
	}
	return {
		id: block.id,
		type: 'image',
		url: block.url,
		alt: block.alt,
		...(block.caption ? { caption: block.caption } : {}),
	};
}

/** Article blocks only (text + image + table) — gallery is handled separately. */
export function eventToInitialBlocks(storedBlocks?: EventContentBlock[]): BlockData[] {
	if (storedBlocks && storedBlocks.length > 0) {
		return storedBlocks.map(storedBlockToEditorBlock);
	}

	return [{ id: 'b0', type: 'text', html: '' }];
}

/** Gallery URLs for the fixed Veranstaltungsbilder section. */
export function eventToInitialGallery(gallery: string[]): string[] {
	return gallery ?? [];
}

export type EventEditorSource = {
	title: string;
	date: string | null;
	category: string;
	excerpt: string;
	cover: string | null;
	initialBlocks: BlockData[];
	initialGallery: string[];
	registrationForm: import('./event-content-blocks').EventRegistrationForm;
	editingDraft: boolean;
};

/** Prefer previewDraft for editor when present. */
export function eventEditorSource(event: {
	title: string;
	date: string | null;
	category: string;
	excerpt: string;
	cover: string | null;
	blocks?: EventContentBlock[];
	gallery: string[];
	registrationForm?: EventRegistrationForm;
	previewDraft?: EventPreviewDraft | null;
}): EventEditorSource {
	const draft = event.previewDraft;
	if (draft) {
		return {
			title: draft.title,
			date: draft.date,
			category: draft.category,
			excerpt: draft.excerpt,
			cover: draft.cover,
			initialBlocks: eventToInitialBlocks(draft.blocks),
			initialGallery: eventToInitialGallery(draft.gallery),
			registrationForm: parseRegistrationForm(draft.registrationForm ?? event.registrationForm),
			editingDraft: true,
		};
	}

	return {
		title: event.title,
		date: event.date,
		category: event.category,
		excerpt: event.excerpt,
		cover: event.cover,
		initialBlocks: eventToInitialBlocks(event.blocks),
		initialGallery: eventToInitialGallery(event.gallery),
		registrationForm: parseRegistrationForm(event.registrationForm),
		editingDraft: false,
	};
}

/** @deprecated Use eventToInitialBlocks + eventToInitialGallery */
export function eventToInitialBlocksLegacy(_body: string[], gallery: string[]): BlockData[] {
	return eventToInitialBlocks(undefined).concat(
		gallery.length > 0
			? [
					{
						id: 'gallery-main',
						type: 'gallery' as const,
						images: gallery.map((photoPath, index) => {
							const url = photoPath.startsWith('/') ? photoPath : photoPath;
							const thumbUrl = url.includes('-thumb')
								? url
								: url.replace(/\.webp$/, '-thumb.webp');
							return {
								id: `gi${index}`,
								url,
								thumbUrl,
								alt: '',
							};
						}),
					},
				]
			: [],
	);
}
