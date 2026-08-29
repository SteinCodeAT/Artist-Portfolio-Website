/**
 * SQLite adapter for events — maps rows ↔ EventRecordBase, plugs into events-store.ts.
 * MANUAL: not generated. When you add/remove a field in content.schema.ts, update
 * rowToEvent/eventToRow here to match.
 */
import { requireTable, type CmsDatabase } from '../storage/db-contract';
import type { RecordListStorage } from '../storage/record-list';
import {
	createEventsStore,
	type EventRecordBase,
	type EventsStoreConfig,
} from './events-store';

type EventRow = Record<string, unknown>;

function rowToEvent(row: EventRow): EventRecordBase {
	return {
		id: row.id as string,
		slug: row.slug as string,
		url: row.url as string,
		title: row.title as string,
		date: (row.date as string | null) ?? null,
		year: (row.year as number | null) ?? null,
		category: row.category as string,
		location: (row.location as string | null) ?? null,
		excerpt: row.excerpt as string,
		cover: (row.cover as string | null) ?? null,
		gallery: (row.gallery as string[]) ?? [],
		photoCount: (row.photoCount as number) ?? 0,
		blocks: row.blocks as EventRecordBase['blocks'],
		registrationForm: row.registrationForm as EventRecordBase['registrationForm'],
		previewDraft: (row.previewDraft as EventRecordBase['previewDraft']) ?? null,
	};
}

function eventToRow(event: EventRecordBase): EventRow {
	return {
		id: event.id,
		slug: event.slug,
		url: event.url,
		title: event.title,
		date: event.date,
		year: event.year,
		category: event.category,
		location: event.location ?? null,
		excerpt: event.excerpt,
		cover: event.cover,
		gallery: event.gallery,
		photoCount: event.photoCount,
		blocks: event.blocks ?? null,
		registrationForm: event.registrationForm ?? null,
		previewDraft: event.previewDraft ?? null,
	};
}

export function eventRecordListStorage(database: CmsDatabase): RecordListStorage<EventRecordBase> {
	const table = requireTable(database, 'events');
	const db = database.open();
	return {
		readAll: () => {
			const rows = db.select().from(table).all() as EventRow[];
			return rows.map(rowToEvent);
		},
		writeAll: (records) => {
			db.transaction((tx) => {
				tx.delete(table).run();
				for (const event of records) {
					tx.insert(table).values(eventToRow(event)).run();
				}
			});
		},
	};
}

export function createEventsStoreWithDatabase(config: EventsStoreConfig, database: CmsDatabase) {
	return createEventsStore(config, eventRecordListStorage(database));
}
