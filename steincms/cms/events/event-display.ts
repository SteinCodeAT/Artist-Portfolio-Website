import type { EventRecordBase } from './events-store';
import type { EventPreviewDraft } from './event-content-blocks';

export type EventDisplayResult<T extends EventRecordBase = EventRecordBase> = {
	event: T;
	isPreview: boolean;
	hasDraft: boolean;
};

function yearFromDate(date: string | null): number | null {
	return date && /^\d{4}/.test(date) ? Number.parseInt(date.slice(0, 4), 10) : null;
}

function stripPreviewDraft<T extends EventRecordBase>(event: T): T {
	const { previewDraft: _, ...publicEvent } = event;
	return publicEvent as T;
}

/** Merge previewDraft for authorized preview mode; never expose draft fields otherwise. */
export function eventForDisplay<T extends EventRecordBase>(
	event: T,
	options: { preview: boolean; authorized: boolean },
): EventDisplayResult<T> {
	const wantsPreview = options.preview && options.authorized;

	if (!wantsPreview) {
		return {
			event: stripPreviewDraft(event),
			isPreview: false,
			hasDraft: false,
		};
	}

	const draft = event.previewDraft as EventPreviewDraft | null | undefined;
	if (!draft) {
		return {
			event: stripPreviewDraft(event),
			isPreview: true,
			hasDraft: false,
		};
	}

	const gallery = draft.gallery ?? event.gallery;
	return {
		event: {
			...event,
			title: draft.title,
			excerpt: draft.excerpt,
			cover: draft.cover,
			date: draft.date,
			year: yearFromDate(draft.date),
			category: draft.category,
			location: draft.location ?? event.location,
			blocks: draft.blocks,
			gallery,
			photoCount: gallery.length,
			registrationForm: draft.registrationForm ?? event.registrationForm,
			previewDraft: undefined,
		},
		isPreview: true,
		hasDraft: true,
	};
}

export function todayLocalIso(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isUpcomingEvent(
	event: Pick<EventRecordBase, 'date' | 'category'>,
	options: { excludeCategories?: string[]; includeToday?: boolean } = {},
): boolean {
	if (!event.date) return false;
	if (options.excludeCategories?.includes(event.category)) return false;
	const today = todayLocalIso();
	return options.includeToday === false ? event.date > today : event.date >= today;
}
