import { index, integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { RegistrationAnswerValue } from '@steincms/cms/events/registration-form';

type EventsTableRef = {
	id: AnySQLiteColumn;
};

export function createRegistrationsTable(eventsTable: EventsTableRef) {
	return sqliteTable(
		'registrations',
		{
			id: text('id').primaryKey(),
			eventId: text('event_id')
				.notNull()
				.references(() => eventsTable.id, { onDelete: 'cascade' }),
			ticketCode: text('ticket_code').unique(),
			name: text('name'),
			email: text('email'),
			guests: integer('guests'),
			answers: text('answers', { mode: 'json' }).$type<Record<string, RegistrationAnswerValue>>(),
			createdAt: text('created_at'),
		},
		(table) => [
			index('registrations_event_id_idx').on(table.eventId),
			index('registrations_event_email_idx').on(table.eventId, table.email),
		],
	);
}
