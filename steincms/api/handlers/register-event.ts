import type { APIRoute } from 'astro';
import { jsonResponse } from '@steincms/api/json-response';
import type { EventRecordBase } from '@steincms/cms/events/events-store';
import { isUpcomingEvent } from '@steincms/cms/events/event-display';
import {
	hasExtraTopLevelKeys,
	isRegistrationEnabled,
	parseRegistrationForm,
	registrationSubmitSchema,
	type RegistrationAnswerValue,
} from '@steincms/cms/events/registration-form';
import { EventFullError } from '@steincms/cms/events/registrations-store';
import type { RegistrationsStore } from '@steincms/cms/events/registrations-store.database';
import {
	MIN_AGE_MS,
	RELOAD_MSG,
	verifyFormToken,
} from '@steincms/cms/forms/form-token';
import { parseRegistrationBody } from '@steincms/cms/forms/parse-registration-body';
import { clientIp } from '@steincms/cms/forms/client-ip';
import { incrementRegistrationCounter } from '@steincms/cms/forms/registration-counters';
import { isSameOrigin } from '@steincms/cms/forms/request-origin';
import { verifyTurnstileToken } from '@steincms/cms/forms/turnstile-verify';

export type RegisterEventHandlerConfig = {
	findEventById: (id: string) => EventRecordBase | undefined;
	registrations: RegistrationsStore;
	excludeCategories?: string[];
	isOpen?: (event: EventRecordBase) => boolean;
};

function fakeSuccess(reason: Parameters<typeof incrementRegistrationCounter>[0]) {
	incrementRegistrationCounter(reason);
	return jsonResponse({ ok: true });
}

export function createRegisterEventHandler(
	config: RegisterEventHandlerConfig,
): { POST: APIRoute } {
	const isOpen =
		config.isOpen ??
		((event: EventRecordBase) =>
			isUpcomingEvent(event, { excludeCategories: config.excludeCategories }));

	const POST: APIRoute = async ({ request }) => {
		try {
			if (!isSameOrigin(request)) {
				// block requests from other domains
				return jsonResponse({ error: 'Anmeldung fehlgeschlagen.' }, 403);
			}

			const body = await parseRegistrationBody(request);
			const ip = clientIp(request);

			if (!(await verifyTurnstileToken(body['cf-turnstile-response'], ip))) {
				// block requests with invalid turnstile token (if turnstile is enabled)
				incrementRegistrationCounter('schema');
				return jsonResponse({ error: 'Anmeldung fehlgeschlagen.' }, 400);
			}

			const eventId = String(body.eventId ?? '').trim();
			const tokenResult = verifyFormToken(body._sibop, eventId);

			if (tokenResult.status === 'expired') {
				// block requests with expired token to enforce that the form was freshly loaded recently
				incrementRegistrationCounter('token_expired');
				return jsonResponse({ error: 'RELOAD', message: RELOAD_MSG }, 409);
			}
			if (tokenResult.status === 'invalid') {
				// block requests with invalid token to enforce that the form was freshly loaded recently
				incrementRegistrationCounter(
					body._sibop ? 'token_invalid' : 'token_missing',
				);
				return jsonResponse({ error: 'Anmeldung fehlgeschlagen.' }, 400);
			}

			if (tokenResult.ageMs < MIN_AGE_MS) {
				// block requests that are too fast to enforce that the form was freshly loaded and filled 
				// by a human, not by a bot
				return fakeSuccess('too_fast');
			}

			if (hasExtraTopLevelKeys(body, tokenResult.baitName)) {
				// block requests with extra top-level keys - block any fields auto-added by bots
				return fakeSuccess('schema');
			}

			const baitValue = body[tokenResult.baitName];
			if (baitValue !== undefined && baitValue !== null && String(baitValue).trim() !== '') {
				// block requests with filled honeypot fields
				return fakeSuccess('bait');
			}

			const event = config.findEventById(eventId);
			if (!event || !isOpen(event)) {
				// block requests for non-existent or closed events
				return jsonResponse({ error: 'Für dieses Event ist keine Anmeldung möglich.' }, 400);
			}

			const form = parseRegistrationForm(event.registrationForm);
			if (!isRegistrationEnabled(form)) {
				// block requests for events with disabled registration
				return jsonResponse({ error: 'Für dieses Event ist keine Anmeldung möglich.' }, 400);
			}

			const parsed = registrationSubmitSchema(form, form.maxGuests).safeParse(body);
			if (!parsed.success) {
				// block requests with invalid schema - block any fields auto-added by bots
				return fakeSuccess('schema');
			}

			const { name, email, guests, answers } = parsed.data;

			const existing = config.registrations.findByEmail(eventId, email);
			if (existing) {
				// do not allow duplicate registrations - return the existing ticket
				incrementRegistrationCounter('duplicate');
				return jsonResponse({
					ok: true,
					ticketCode: existing.ticketCode,
					ticketUrl: config.registrations.ticketPath(existing.ticketCode),
				});
			}

			try {
				const row = await config.registrations.appendRegistration(eventId, {
					name,
					email,
					guests,
					answers: answers as Record<string, RegistrationAnswerValue>,
					maxAttendees: form.maxAttendees,
				});

				incrementRegistrationCounter('ok');
				return jsonResponse({
					ok: true,
					ticketCode: row.ticketCode,
					ticketUrl: config.registrations.ticketPath(row.ticketCode),
				});
			} catch (error) {
				if (error instanceof EventFullError) {
					return jsonResponse(
						{
							error:
								'Diese Veranstaltung ist bereits ausgebucht. Bei Interesse wenden Sie sich bitte direkt an GuanXi über die Kontaktseite.',
						},
						400,
					);
				}
				throw error;
			}
		} catch (error) {
			// log any errors
			console.error('POST /api/register-event', error);
			return jsonResponse({ error: 'Anmeldung derzeit nicht möglich.' }, 500);
		}
	};

	return { POST };
}
