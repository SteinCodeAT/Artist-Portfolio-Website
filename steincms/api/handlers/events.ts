import type { APIRoute } from 'astro';
import { jsonResponse } from '@steincms/api/json-response';
import { logCmsActivity } from '@steincms/api/log-cms-activity';
import type { ActivityLogStore } from '@steincms/cms/activity-log';

function yearFromDate(date: string | null): number | null {
	return date && /^\d{4}/.test(date) ? Number.parseInt(date.slice(0, 4), 10) : null;
}

export type EventsHandlerOptions = {
	activityLog?: ActivityLogStore | null;
};

export function createEventsHandler(
	store: ReturnType<typeof import('@steincms/cms/events/events-store').createEventsStore>,
	config: string | { adminPath: string; calendarPath?: string; listPath?: string },
	options: EventsHandlerOptions = {},
): { GET: APIRoute; POST: APIRoute; PUT: APIRoute; DELETE: APIRoute } {
	const adminPath = typeof config === 'string' ? config : config.adminPath;
	const calendarPath =
		typeof config === 'string'
			? `${adminPath}/veranstaltungen-manager`
			: (config.calendarPath ?? `${adminPath}/veranstaltungen-manager`);
	const listPath =
		typeof config === 'string'
			? `${adminPath}/beitraege-manager`
			: (config.listPath ?? `${adminPath}/beitraege-manager`);
	const activityLog = options.activityLog;

	function editorHref(id: string): string {
		return `${listPath}/bearbeiten?id=${encodeURIComponent(id)}`;
	}

	function managerRedirect(year?: number | null): Response {
		const location = year ? `${calendarPath}?year=${year}` : calendarPath;
		return new Response(null, {
			status: 303,
			headers: { Location: location },
		});
	}

	const GET: APIRoute = async () => {
		try {
			const events = store.readEventRecords();
			return jsonResponse({ ok: true, events });
		} catch (error) {
			console.error('GET /api/update-events failed:', error);
			return jsonResponse({ error: 'Failed to read events' }, 500);
		}
	};

	const POST: APIRoute = async ({ request }) => {
		try {
			const contentType = request.headers.get('content-type') ?? '';

			if (contentType.includes('application/json')) {
				const body = (await request.json()) as Record<string, unknown>;
				const action = String(body.action ?? 'publish').trim();
				const id = String(body.id ?? '').trim() || store.nextEventId(store.readEventRecords());

				try {
					const formInput = store.parseFormInput(body);

					if (action === 'save-draft') {
						const event = await store.savePreviewDraft(id, formInput);
						await logCmsActivity(activityLog, request, {
							kind: 'draft',
							action: 'Entwurf gespeichert',
							title: event.title,
							href: editorHref(event.id),
						});
						return jsonResponse({ ok: true, event });
					}

					if (action === 'publish') {
						const event = await store.publishEvent(id, formInput);
						await logCmsActivity(activityLog, request, {
							kind: 'event',
							action: 'Veranstaltung veröffentlicht',
							title: event.title,
							href: editorHref(event.id),
						});
						return jsonResponse({ ok: true, event });
					}

					return jsonResponse({ error: 'Unbekannte Aktion' }, 400);
				} catch (error) {
					return jsonResponse(
						{ error: error instanceof Error ? error.message : 'Ungültige Eingabe' },
						400,
					);
				}
			}

			const data = await request.formData();
			const title = String(data.get('title') ?? '').trim();

			if (!title) {
				return jsonResponse({ error: 'Titel fehlt' }, 400);
			}

			let date: string | null;
			let category: string;
			let blocks: import('@steincms/cms/events/event-content-blocks').EventContentBlock[];

			try {
				date = store.parseDate(data.get('date'));
				category = store.parseCategory(data.get('category'));
				const { eventBodyToBlocks } = await import('@steincms/cms/events/event-body-blocks');
				const parsedBody = store.parseBody(String(data.get('body') ?? data.get('description') ?? ''));
				blocks = eventBodyToBlocks(parsedBody) as import('@steincms/cms/events/event-content-blocks').EventContentBlock[];
			} catch (error) {
				return jsonResponse(
					{ error: error instanceof Error ? error.message : 'Ungültige Eingabe' },
					400,
				);
			}

			const created = await store.appendEventRecord({
				title,
				date,
				category,
				excerpt: String(data.get('excerpt') ?? '').trim() || undefined,
				blocks,
			});
			await logCmsActivity(activityLog, request, {
				kind: 'event',
				action: 'Veranstaltung angelegt',
				title: created.title,
				href: editorHref(created.id),
			});

			return managerRedirect(yearFromDate(date));
		} catch (error) {
			console.error('POST /api/update-events failed:', error);
			return jsonResponse({ error: 'Failed to write data' }, 500);
		}
	};

	const PUT: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			const id = String(body.id ?? '').trim();
			const action = String(body.action ?? 'publish').trim();

			if (!id) {
				return jsonResponse({ error: 'ID fehlt' }, 400);
			}

			if (action === 'discard-draft') {
				const event = await store.discardPreviewDraft(id);
				if (!event) {
					return jsonResponse({ error: 'Veranstaltung nicht gefunden' }, 404);
				}
				await logCmsActivity(activityLog, request, {
					kind: 'draft',
					action: 'Entwurf verworfen',
					title: event.title,
					href: editorHref(event.id),
				});
				return jsonResponse({ ok: true, event });
			}

			try {
				const formInput = store.parseFormInput(body);

				if (action === 'save-draft') {
					const event = await store.savePreviewDraft(id, formInput);
					await logCmsActivity(activityLog, request, {
						kind: 'draft',
						action: 'Entwurf gespeichert',
						title: event.title,
						href: editorHref(event.id),
					});
					return jsonResponse({ ok: true, event });
				}

				if (action === 'publish') {
					const event = await store.publishEvent(id, formInput);
					await logCmsActivity(activityLog, request, {
						kind: 'event',
						action: 'Veranstaltung veröffentlicht',
						title: event.title,
						href: editorHref(event.id),
					});
					return jsonResponse({ ok: true, event });
				}

				return jsonResponse({ error: 'Unbekannte Aktion' }, 400);
			} catch (error) {
				return jsonResponse(
					{ error: error instanceof Error ? error.message : 'Ungültige Eingabe' },
					400,
				);
			}
		} catch (error) {
			console.error('PUT /api/update-events failed:', error);
			return jsonResponse({ error: 'Failed to update data' }, 500);
		}
	};

	const DELETE: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as { id?: string };
			const id = String(body.id ?? '').trim();

			if (!id) {
				return jsonResponse({ error: 'ID fehlt' }, 400);
			}

			const existing = store.findEventById(id);
			const removed = await store.deleteEventRecord(id);
			if (!removed) {
				return jsonResponse({ error: 'Veranstaltung nicht gefunden' }, 404);
			}

			await logCmsActivity(activityLog, request, {
				kind: 'event',
				action: 'Veranstaltung gelöscht',
				title: existing?.title ?? id,
			});
			return jsonResponse({ ok: true });
		} catch (error) {
			console.error('DELETE /api/update-events failed:', error);
			return jsonResponse({ error: 'Failed to delete data' }, 500);
		}
	};

	return { GET, POST, PUT, DELETE };
}

export type EventsHandlerStore = ReturnType<
	typeof import('@steincms/cms/events/events-store').createEventsStore
>;
