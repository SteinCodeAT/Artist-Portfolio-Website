import { recordForDisplay, type RecordDef } from '@steincms/cms/schema';
import type { EventRecordBase } from './events-store';
import type { EventContentBlock, EventRegistrationForm } from './event-content-blocks';

export type EventDisplayResult<T extends EventRecordBase = EventRecordBase> = {
	event: T;
	isPreview: boolean;
	hasDraft: boolean;
};

function yearFromDate(date: string | null): number | null {
	return date && /^\d{4}/.test(date) ? Number.parseInt(date.slice(0, 4), 10) : null;
}

/** Merge previewDraft for authorized preview mode; never expose draft fields otherwise. */
export function eventForDisplay<T extends EventRecordBase>(
	event: T,
	options: { preview: boolean; authorized: boolean },
	recordDef?: RecordDef,
): EventDisplayResult<T> {
	const { record, isPreview, hasDraft } = recordForDisplay(event, options, recordDef);
	if (!hasDraft) {
		return { event: record, isPreview, hasDraft };
	}

	const gallery = (record.gallery ?? event.gallery) as string[];
	return {
		event: {
			...record,
			year: yearFromDate(record.date),
			gallery,
			photoCount: gallery.length,
			blocks: (record.blocks ?? event.blocks) as EventContentBlock[] | undefined,
			registrationForm:
				(record.registrationForm as EventRegistrationForm | undefined) ?? event.registrationForm,
		},
		isPreview,
		hasDraft,
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
