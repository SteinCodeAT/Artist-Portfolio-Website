/**
 * Business logic for events — validation, slugs, ids, previews, publish flow.
 * Storage-agnostic: reads/writes go through the injected `RecordListStorage`
 * (see events-store.database.ts, the SQLite adapter every project actually
 * uses). `lockFilePath` has nothing to do with where data lives — it just
 * gives concurrent writes to this collection a stable file to lock on.
 */
import { createFileStore } from '@steincms/cms/core/file-store';
import { ensureUniqueSlug, slugify } from '@steincms/cms/core/slug';
import { createUuidV7 } from '@steincms/cms/core/uuid';
import { deleteEntryMedia, type MediaConfig } from '@steincms/cms/media/media-store';
import {
	buildPreviewDraft,
	eventContentBlocksToBody,
	validateEventContentBlocks,
	type EventContentBlock,
	type EventFormInput,
	type EventPreviewDraft,
	type EventRegistrationForm,
} from './event-content-blocks';
import { parseRegistrationForm } from './registration-form.ts';
import type { RecordListStorage } from '@steincms/cms/storage/record-list';
export type {
	EventContentBlock,
	EventFormInput,
	EventImageBlock,
	EventPreviewDraft,
	EventRegistrationForm,
	EventTableBlock,
	EventTextBlock,
} from './event-content-blocks';

export type EventRecordBase = {
	id: string;
	slug: string;
	url: string;
	title: string;
	date: string | null;
	year: number | null;
	category: string;
	location?: string | null;
	excerpt: string;
	blocks?: EventContentBlock[];
	cover: string | null;
	gallery: string[];
	photoCount: number;
	registrationForm?: EventRegistrationForm;
	previewDraft?: EventPreviewDraft | null;
};

export type CreateEventInput = {
	id?: string;
	title: string;
	date: string | null;
	category: string;
	location?: string | null;
	excerpt?: string;
	blocks?: EventContentBlock[];
	cover?: string | null;
	gallery?: string[];
	slug?: string;
	url?: string;
	registrationForm?: EventRegistrationForm;
};

export type UpdateEventInput = Partial<CreateEventInput>;

export type EventsStoreConfig = {
	/** Stable per-collection path used only to serialize concurrent writes (see core/file-store.ts). Not a data file. */
	lockFilePath: string;
	categories: Record<string, { label: string; tone: string }>;
	baseUrl: string;
	publicPath: string;
	mediaConfig: MediaConfig;
};

function yearFromDate(date: string | null): number | null {
	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return null;
	}
	return Number.parseInt(date.slice(0, 4), 10);
}

function slugFromTitleAndDate(title: string, date: string | null): string {
	const base = slugify(title);
	if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		const [, month, day] = date.split('-');
		return `${base}-${day}-${month}-${date.slice(0, 4)}`;
	}
	return base;
}

function buildEventUrl(baseUrl: string, publicPath: string, slug: string): string {
	return `${baseUrl}${publicPath}/${slug}`;
}

function excerptFromBlocks(blocks: EventContentBlock[], excerpt?: string): string {
	const trimmed = (excerpt ?? '').trim();
	if (trimmed) {
		return trimmed;
	}
	const lines = eventContentBlocksToBody(blocks);
	const first = lines.find((paragraph) => paragraph.trim());
	return first?.trim() ?? '';
}

function normalizeEventRecord(raw: EventRecordBase & { id?: string; body?: string[] }): EventRecordBase {
	const gallery = raw.gallery ?? [];
	const { body: _legacyBody, ...rest } = raw;
	return {
		...rest,
		id: raw.id ?? raw.slug,
		gallery,
		blocks: raw.blocks,
		previewDraft: raw.previewDraft ?? null,
		photoCount: raw.photoCount ?? gallery.length,
	};
}

function compareEventsNewestFirst(a: EventRecordBase, b: EventRecordBase): number {
	return (b.date ?? '').localeCompare(a.date ?? '');
}

export function createEventsStore(config: EventsStoreConfig, storage: RecordListStorage<EventRecordBase>) {
	const store = createFileStore(config.lockFilePath);

	function readEventRecords(): EventRecordBase[] {
		return storage.readAll().map(normalizeEventRecord);
	}

	function writeEventRecords(records: EventRecordBase[]): void {
		storage.writeAll(records);
	}

	function parseCategory(value: unknown): string {
		const category = String(value ?? '').trim();
		if (!category) {
			throw new Error('Kategorie fehlt');
		}
		return category;
	}

	function parseBody(value: unknown): string[] {
		if (Array.isArray(value)) {
			return value.map((paragraph) => String(paragraph).trim()).filter(Boolean);
		}
		if (typeof value === 'string') {
			return value
				.split(/\n{2,}/)
				.map((paragraph) => paragraph.trim())
				.filter(Boolean);
		}
		return [];
	}

	function parseDate(value: unknown): string | null {
		if (value === null || value === undefined || value === '') {
			return null;
		}
		const date = String(value).trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			throw new Error('Ungültiges Datum (YYYY-MM-DD)');
		}
		return date;
	}

	function categoryLabel(category: string): string {
		return config.categories[category]?.label ?? category;
	}

	function findEventById(id: string): EventRecordBase | undefined {
		return readEventRecords().find((event) => event.id === id);
	}

	function findEventBySlug(slug: string): EventRecordBase | undefined {
		return readEventRecords().find((event) => event.slug === slug);
	}

	function nextEventId(records: EventRecordBase[]): string {
		return createUuidV7();
	}

	function planEventSlug(
		title: string,
		date: string | null,
		existing: EventRecordBase[],
		keepSlug?: string,
	): string {
		return ensureUniqueSlug(
			keepSlug ?? slugFromTitleAndDate(title, date),
			existing.map((event) => event.slug),
			keepSlug,
		);
	}

	function parseBlocks(value: unknown): EventContentBlock[] {
		return validateEventContentBlocks(value, config.mediaConfig);
	}

	function buildEventRecord(
		input: CreateEventInput,
		existing: EventRecordBase[],
		keep?: Pick<EventRecordBase, 'id' | 'slug' | 'blocks' | 'previewDraft' | 'registrationForm' | 'location'>,
	): EventRecordBase {
		const blocks =
			input.blocks !== undefined ? input.blocks : (keep?.blocks ?? []);
		const date = input.date ?? null;
		const slug = ensureUniqueSlug(
			input.slug?.trim() || slugFromTitleAndDate(input.title, date),
			existing.map((event) => event.slug),
			keep?.slug,
		);
		const cover = input.cover === undefined ? null : input.cover;
		const gallery = input.gallery ?? [];
		const registrationForm =
			input.registrationForm !== undefined
				? parseRegistrationForm(input.registrationForm)
				: keep?.registrationForm;

		return {
			id: keep?.id ?? input.id ?? nextEventId(existing),
			slug,
			url: input.url?.trim() || buildEventUrl(config.baseUrl, config.publicPath, slug),
			title: input.title.trim(),
			date,
			year: yearFromDate(date),
			category: input.category,
			location: input.location?.trim() || keep?.location || null,
			excerpt: excerptFromBlocks(blocks, input.excerpt),
			blocks: blocks.length > 0 ? blocks : undefined,
			cover,
			gallery,
			photoCount: gallery.length,
			...(registrationForm ? { registrationForm } : {}),
			previewDraft: keep?.previewDraft ?? null,
		};
	}

	function loadEvents(): EventRecordBase[] {
		return readEventRecords().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
	}

	function appendEventRecord(input: CreateEventInput): Promise<EventRecordBase> {
		return store.runWithLock(() => {
			const existing = readEventRecords();
			const newEvent = buildEventRecord(input, existing);
			const updated = [...existing, newEvent].sort(compareEventsNewestFirst);
			writeEventRecords(updated);
			return newEvent;
		});
	}

	function updateEventRecord(id: string, patch: UpdateEventInput): Promise<EventRecordBase | null> {
		return store.runWithLock(() => {
			const existing = readEventRecords();
			const index = existing.findIndex((event) => event.id === id);
			if (index === -1) {
				return null;
			}

			const current = existing[index];
			const merged: CreateEventInput = {
				title: patch.title ?? current.title,
				date: patch.date !== undefined ? patch.date : current.date,
				category: patch.category ?? current.category,
				excerpt: patch.excerpt ?? current.excerpt,
				blocks: patch.blocks ?? current.blocks,
				cover: patch.cover !== undefined ? patch.cover : current.cover,
				gallery: patch.gallery ?? current.gallery,
				slug: patch.slug ?? current.slug,
				url: patch.url ?? current.url,
				registrationForm: patch.registrationForm ?? current.registrationForm,
				location: patch.location !== undefined ? patch.location : current.location,

			};

			const updatedEvent = buildEventRecord(merged, existing, {
				id: current.id,
				slug: current.slug,
				blocks: merged.blocks,
				previewDraft: current.previewDraft,
				registrationForm: merged.registrationForm,
			});
			const updated = [...existing];
			updated[index] = updatedEvent;
			updated.sort(compareEventsNewestFirst);
			writeEventRecords(updated);
			return updatedEvent;
		});
	}

	function deleteEventRecord(id: string): Promise<boolean> {
		return store.runWithLock(() => {
			const existing = readEventRecords();
			const filtered = existing.filter((event) => event.id !== id);
			if (filtered.length === existing.length) {
				return false;
			}
			writeEventRecords(filtered);
			deleteEntryMedia(config.mediaConfig, 'events', id);
			return true;
		});
	}

	function savePreviewDraft(id: string, input: EventFormInput): Promise<EventRecordBase> {
		return store.runWithLock(() => {
			const existing = readEventRecords();
			const draft = buildPreviewDraft(input);
			const index = existing.findIndex((event) => event.id === id);

			if (index === -1) {
				const stub = buildEventRecord(
					{
						id,
						title: input.title,
						date: input.date,
						category: input.category,
						excerpt: '',
						blocks: [],
						gallery: [],
						registrationForm: input.registrationForm,
					},
					existing,
				);
				stub.previewDraft = draft;
				const updated = [...existing, stub].sort(compareEventsNewestFirst);
				writeEventRecords(updated);
				return stub;
			}

			const updated = [...existing];
			updated[index] = { ...existing[index], previewDraft: draft };
			writeEventRecords(updated);
			return updated[index];
		});
	}

	function publishEvent(id: string, input: EventFormInput): Promise<EventRecordBase> {
		return store.runWithLock(() => {
			const existing = readEventRecords();
			const index = existing.findIndex((event) => event.id === id);

			if (index === -1) {
				const published = buildEventRecord(
					{
						id,
						title: input.title,
						date: input.date,
						category: input.category,
						excerpt: input.excerpt,
						blocks: input.blocks,
						gallery: input.gallery,
						cover: input.cover ?? null,
						registrationForm: input.registrationForm,
					},
					existing,
				);
				published.previewDraft = null;
				const updated = [...existing, published].sort(compareEventsNewestFirst);
				writeEventRecords(updated);
				return published;
			}

			const current = existing[index];
			const merged: CreateEventInput = {
				title: input.title,
				date: input.date,
				category: input.category,
				excerpt: input.excerpt,
				blocks: input.blocks,
				gallery: input.gallery,
				cover: input.cover ?? null,
				slug: current.slug,
				url: current.url,
				registrationForm: input.registrationForm,
				location: input.location ?? current.location,
			};

			const published = buildEventRecord(merged, existing, {
				id: current.id,
				slug: current.slug,
				registrationForm: input.registrationForm,
			});
			published.previewDraft = null;

			const updated = [...existing];
			updated[index] = published;
			updated.sort(compareEventsNewestFirst);
			writeEventRecords(updated);
			return published;
		});
	}

	function discardPreviewDraft(id: string): Promise<EventRecordBase | null> {
		return store.runWithLock(() => {
			const existing = readEventRecords();
			const index = existing.findIndex((event) => event.id === id);
			if (index === -1) {
				return null;
			}

			const updated = [...existing];
			updated[index] = { ...existing[index], previewDraft: null };
			writeEventRecords(updated);
			return updated[index];
		});
	}

	function parseFormInput(body: Record<string, unknown>): EventFormInput {
		const title = String(body.title ?? '').trim();
		if (!title) {
			throw new Error('Titel fehlt');
		}

		const date = parseDate(body.date);
		const category = parseCategory(body.category);
		const location = String(body.location ?? '').trim() || null;
		const blocks = body.blocks !== undefined ? parseBlocks(body.blocks) : [];
		const gallery = Array.isArray(body.gallery)
			? body.gallery.map((item) => String(item).trim()).filter(Boolean)
			: [];
		const cover = body.cover === null ? null : String(body.cover ?? '').trim() || null;

		return {
			title,
			excerpt: String(body.excerpt ?? '').trim(),
			cover,
			date,
			category,
			location,
			blocks,
			gallery,
			registrationForm: parseRegistrationForm(body.registrationForm),
		};
	}

	return {
		readEventRecords,
		loadEvents,
		findEventById,
		findEventBySlug,
		parseCategory,
		parseBody,
		parseBlocks,
		parseDate,
		categoryLabel,
		planEventSlug,
		appendEventRecord,
		updateEventRecord,
		deleteEventRecord,
		nextEventId,
		savePreviewDraft,
		publishEvent,
		discardPreviewDraft,
		parseFormInput,
	};
}
