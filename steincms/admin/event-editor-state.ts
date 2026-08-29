import type { EventEditorSource } from '@steincms/cms/events/event-body-blocks';
import { eventEditorSource } from '@steincms/cms/events/event-body-blocks';
import type { EventRecordBase } from '@steincms/cms/events/events-store';
import type { AdminPaths } from './nav';

export type EventEditorPaths = {
	admin: string;
	public: string;
	list: string;
	calendar: string;
};

export type EventEditorStore = {
	findEventById(id: string): EventRecordBase | undefined;
	readEventRecords(): EventRecordBase[];
	nextEventId(records: EventRecordBase[]): string;
};

export type EventEditorPageCoreProps = {
	source: EventEditorSource | null;
	paths: EventEditorPaths;
	event: EventRecordBase | null;
	editorEventId: string;
	isEdit: boolean;
	fromCalendar: boolean;
	backHref: string;
	backLabel: string;
	prefillDate: string | null;
};

export type LoadEventEditorStateInput = {
	url: URL;
	store: EventEditorStore;
	adminPaths: AdminPaths;
	eventsPublicPath: string;
};

export type LoadEventEditorStateResult =
	| { redirect: string }
	| {
			props: EventEditorPageCoreProps;
			event: EventRecordBase | undefined;
			isEdit: boolean;
			fromCalendar: boolean;
	  };

export function loadEventEditorState(input: LoadEventEditorStateInput): LoadEventEditorStateResult {
	const { url, store, adminPaths, eventsPublicPath } = input;
	const eventId = url.searchParams.get('id');
	const event = eventId ? store.findEventById(eventId) : undefined;
	const fromCalendar = url.searchParams.get('from') === 'calendar';
	const prefillDateRaw = url.searchParams.get('date');
	const prefillDate =
		prefillDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(prefillDateRaw) ? prefillDateRaw : null;

	if (eventId && !event) {
		return { redirect: adminPaths.posts };
	}

	const isEdit = Boolean(event);
	const source = event ? eventEditorSource(event) : null;

	return {
		event,
		isEdit,
		fromCalendar,
		props: {
			source,
			paths: {
				admin: adminPaths.base,
				public: eventsPublicPath,
				list: adminPaths.posts,
				calendar: adminPaths.calendar,
			},
			event: event ?? null,
			editorEventId: event?.id ?? store.nextEventId(store.readEventRecords()),
			isEdit,
			fromCalendar,
			backHref: fromCalendar ? adminPaths.calendar : adminPaths.posts,
			backLabel: fromCalendar ? '← Zurück zum Kalender' : '← Zurück zur Liste',
			prefillDate,
		},
	};
}
