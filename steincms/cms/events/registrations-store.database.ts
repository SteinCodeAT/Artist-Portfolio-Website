/**
 * SQLite adapter for event registrations — the only implementation any
 * project uses (registrations-store.ts holds just the shared types).
 * MANUAL: not generated. Update rowToRegistration here if the shape changes.
 */
import { randomBytes } from 'node:crypto';
import { eq, type SQLWrapper } from 'drizzle-orm';
import { createUuidV7 } from '@steincms/cms/core/uuid';
import type { RegistrationAnswerValue } from '@steincms/cms/events/registration-form';
import { requireTable, REGISTRATIONS_TABLE, type CmsDatabase } from '../storage/db-contract';
import {
	EventFullError,
	type EventRegistration,
	type RegistrationsStoreConfig,
} from './registrations-store';

export { EventFullError, type EventRegistration, type RegistrationsStoreConfig };

type RegistrationRow = {
	id: string;
	eventId: string;
	ticketCode: string;
	name: string;
	email: string;
	guests: number;
	answers?: Record<string, RegistrationAnswerValue> | null;
	createdAt: string;
};

const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_TICKET_BODY_LENGTH = 6;

function eqColumn(column: unknown, value: unknown) {
	return eq(column as SQLWrapper, value);
}

function normalizePrefix(prefix: string) {
	return prefix.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function createRegistrationsStoreWithDatabase(
	config: RegistrationsStoreConfig,
	database: CmsDatabase,
) {
	const table = requireTable(database, REGISTRATIONS_TABLE) as  {
		id: unknown;
		eventId: unknown;
		ticketCode: unknown;
		name: unknown;
		email: unknown;
		guests: unknown;
		answers: unknown;
		createdAt: unknown;
	};
	const ticketPrefix = normalizePrefix(config.ticketPrefix);
	if (!ticketPrefix) {
		throw new Error('registrations.ticketPrefix must contain at least one alphanumeric character');
	}

	const bodyLength = config.ticketBodyLength ?? DEFAULT_TICKET_BODY_LENGTH;
	const ticketPathPrefix = config.ticketPathPrefix ?? '/ticket';
	const hyphenatedPrefix = `${ticketPrefix}-`;

	function safeEventId(eventId: string) {
		if (!/^[a-zA-Z0-9_-]+$/.test(eventId)) throw new Error('Ungültige Event-ID');
		return eventId;
	}

	function normalizeTicketCode(raw: string) {
		const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (compact.startsWith(ticketPrefix) && compact.length === ticketPrefix.length + bodyLength) {
			return `${hyphenatedPrefix}${compact.slice(ticketPrefix.length)}`;
		}
		return compact;
	}

	function ticketPath(code: string) {
		return `${ticketPathPrefix}/${encodeURIComponent(normalizeTicketCode(code))}`;
	}

	function createTicketCode() {
		const bytes = randomBytes(bodyLength);
		let body = '';
		for (let i = 0; i < bodyLength; i++) body += TICKET_ALPHABET[bytes[i] % TICKET_ALPHABET.length];
		return `${hyphenatedPrefix}${body}`;
	}

	function rowToRegistration(row: RegistrationRow): EventRegistration {
		return {
			id: row.id,
			ticketCode: row.ticketCode,
			name: row.name,
			email: row.email,
			guests: row.guests,
			answers: row.answers ?? undefined,
			createdAt: row.createdAt,
		};
	}

	function readRegistrations(eventId: string): EventRegistration[] {
		const id = safeEventId(eventId);
		const rows = database.open().select().from(table).where(eqColumn(table.eventId, id)).all() as RegistrationRow[];
		return rows.map(rowToRegistration);
	}

	function findByEmail(eventId: string, email: string) {
		return readRegistrations(eventId).find((row) => row.email === email.trim().toLowerCase());
	}

	function usedTicketCodes() {
		const rows = database.open().select({ ticketCode: table.ticketCode }).from(table).all() as {
			ticketCode: string | null;
		}[];
		return new Set(rows.map((r) => r.ticketCode).filter(Boolean) as string[]);
	}

	function guestCount(list: EventRegistration[]) {
		return list.reduce((sum, row) => sum + row.guests, 0);
	}

	function findRegistrationByTicket(code: string) {
		const wanted = normalizeTicketCode(code);
		if (!wanted.startsWith(hyphenatedPrefix)) return null;
		const row = database.open().select().from(table).where(eqColumn(table.ticketCode, wanted)).get() as
			| RegistrationRow
			| undefined;
		if (!row?.eventId) return null;
		const registration = readRegistrations(row.eventId).find((r) => r.ticketCode === wanted);
		if (!registration) return null;
		return { eventId: row.eventId, registration };
	}

	function appendRegistration(
		eventId: string,
		input: {
			name: string;
			email: string;
			guests: number;
			answers?: Record<string, RegistrationAnswerValue>;
			maxAttendees: number;
		},
	): Promise<EventRegistration> {
		const id = safeEventId(eventId);
		let created!: EventRegistration;

		database.open().transaction(() => {
			const list = readRegistrations(id);
			if (guestCount(list) + input.guests > input.maxAttendees) throw new EventFullError();
			const used = usedTicketCodes();
			let ticketCode = createTicketCode();
			while (used.has(ticketCode)) ticketCode = createTicketCode();

			created = {
				id: createUuidV7(),
				ticketCode,
				name: input.name,
				email: input.email.toLowerCase(),
				guests: input.guests,
				...(input.answers && Object.keys(input.answers).length > 0 ? { answers: input.answers } : {}),
				createdAt: new Date().toISOString(),
			};

			database.open().insert(table).values({
				id: created.id,
				eventId: id,
				ticketCode: created.ticketCode,
				name: created.name,
				email: created.email,
				guests: created.guests,
				answers: created.answers ?? null,
				createdAt: created.createdAt,
			}).run();
		});

		return Promise.resolve(created);
	}

	function clearRegistrations(eventId: string): Promise<void> {
		const id = safeEventId(eventId);
		database.open().transaction(() => {
			database.open().delete(table).where(eqColumn(table.eventId, id)).run();
		});
		return Promise.resolve();
	}

	return {
		ticketPrefix,
		normalizeTicketCode,
		ticketPath,
		readRegistrations,
		findByEmail,
		guestCount,
		findRegistrationByTicket,
		appendRegistration,
		clearRegistrations,
	};
}

export type RegistrationsStore = ReturnType<typeof createRegistrationsStoreWithDatabase>;
