/**
 * Shared types for event registrations — kept separate from
 * registrations-store.database.ts (the SQLite adapter, and the only
 * implementation every project actually uses) so both the error class and
 * the config shape have one home.
 */
import type { RegistrationAnswerValue } from '@steincms/cms/events/registration-form';

export class EventFullError extends Error {
	constructor(message = 'Diese Veranstaltung ist bereits ausgebucht.') {
		super(message);
		this.name = 'EventFullError';
	}
}

export type EventRegistration = {
	id: string;
	ticketCode: string;
	name: string;
	email: string;
	guests: number;
	answers?: Record<string, RegistrationAnswerValue>;
	createdAt: string;
};

export type RegistrationsStoreConfig = {
	ticketPrefix: string;
	ticketPathPrefix?: string;
	ticketBodyLength?: number;
};
