import type { APIRoute } from 'astro';
import type { ContentSchemaRegistry } from '@steincms/cms/schema';
import { jsonResponse } from '@steincms/api/json-response';
import { logCmsActivity } from '@steincms/api/log-cms-activity';
import type { ActivityLogStore } from '@steincms/cms/activity-log';
import type { CmsDatabase } from '@steincms/cms/storage/db-contract';
import {
	readValidateSingleton,
	writeValidateSingleton,
} from '@steincms/db/singletons-store';
import type { z } from 'zod';

export type CollectionContentHandlerOptions = {
	database: CmsDatabase;
	activityLog?: ActivityLogStore | null;
	pageHref?: (collectionId: string) => string | undefined;
};

export function createCollectionContentHandler(
	contentSchema: ContentSchemaRegistry,
	options: CollectionContentHandlerOptions,
): { GET: APIRoute; POST: APIRoute } {
	function resolveSingleton(collectionId: string) {
		const def = contentSchema[collectionId];
		if (!def || def.kind !== 'singleton') return null;
		return def;
	}

	const GET: APIRoute = async ({ params }) => {
		const collectionId = params.collection ?? '';
		const def = resolveSingleton(collectionId);
		if (!def) return jsonResponse({ error: 'Unknown collection' }, 404);

		try {
			const data = readValidateSingleton(options.database, collectionId, def.schema as z.ZodTypeAny);
			return jsonResponse({ ok: true, data });
		} catch (error) {
			console.error(`GET /api/content/${collectionId} failed:`, error);
			return jsonResponse({ error: 'Failed to read content' }, 500);
		}
	};

	const POST: APIRoute = async ({ params, request }) => {
		const collectionId = params.collection ?? '';
		const def = resolveSingleton(collectionId);
		if (!def) return jsonResponse({ error: 'Unknown collection' }, 404);

		try {
			const body = (await request.json()) as Record<string, unknown>;
			const parsed = def.schema.safeParse(body);
			if (!parsed.success) return jsonResponse({ error: parsed.error.message }, 400);

			writeValidateSingleton(
				options.database,
				collectionId,
				def.schema as z.ZodTypeAny,
				parsed.data as Record<string, unknown>,
			);
			const label = def.admin.label ?? collectionId;
			await logCmsActivity(options.activityLog, request, {
				kind: 'page',
				action: 'Seite gespeichert',
				title: label,
				href: options.pageHref?.(collectionId),
			});
			return jsonResponse({ ok: true, data: parsed.data });
		} catch (error) {
			console.error(`POST /api/content/${collectionId} failed:`, error);
			return jsonResponse({ error: 'Failed to write content' }, 500);
		}
	};

	return { GET, POST };
}

/** @deprecated Use createCollectionContentHandler with the content schema registry. */
export function createSingletonContentHandler(
	read: () => Record<string, unknown>,
	write: (data: Record<string, unknown>) => void,
	schema: z.ZodTypeAny,
): { GET: APIRoute; POST: APIRoute } {
	const GET: APIRoute = async () => {
		try {
			return jsonResponse({ ok: true, data: read() });
		} catch (error) {
			console.error('GET singleton content failed:', error);
			return jsonResponse({ error: 'Failed to read content' }, 500);
		}
	};

	const POST: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			const parsed = schema.safeParse(body);
			if (!parsed.success) return jsonResponse({ error: parsed.error.message }, 400);
			write(parsed.data as Record<string, unknown>);
			return jsonResponse({ ok: true, data: parsed.data });
		} catch (error) {
			console.error('POST singleton content failed:', error);
			return jsonResponse({ error: 'Failed to write content' }, 500);
		}
	};

	return { GET, POST };
}
