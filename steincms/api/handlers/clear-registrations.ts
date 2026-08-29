import type { APIRoute } from 'astro';
import { jsonResponse } from '@steincms/api/json-response';
import { logCmsActivity } from '@steincms/api/log-cms-activity';
import type { ActivityLogStore } from '@steincms/cms/activity-log';
import type { EventRecordBase } from '@steincms/cms/events/events-store';
import type { RegistrationsStore } from '@steincms/cms/events/registrations-store.database';

export type ClearRegistrationsHandlerConfig = {
	findEventById: (id: string) => EventRecordBase | undefined;
	registrations: RegistrationsStore;
	activityLog?: ActivityLogStore | null;
	eventHref?: (id: string) => string;
};

export function createClearRegistrationsHandler(
	config: ClearRegistrationsHandlerConfig,
): { POST: APIRoute } {
	const POST: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			const eventId = String(body.eventId ?? '').trim();
			const event = config.findEventById(eventId);
			if (!eventId || !event) {
				return jsonResponse({ error: 'Event nicht gefunden.' }, 400);
			}

			await config.registrations.clearRegistrations(eventId);
			await logCmsActivity(config.activityLog, request, {
				kind: 'event',
				action: 'Gästeliste gelöscht',
				title: event.title,
				href: config.eventHref?.(event.id),
			});
			return jsonResponse({ ok: true });
		} catch (error) {
			console.error('POST /api/clear-registrations', error);
			return jsonResponse({ error: 'Liste konnte nicht gelöscht werden.' }, 500);
		}
	};

	return { POST };
}
