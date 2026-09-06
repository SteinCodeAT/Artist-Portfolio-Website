import type { APIRoute } from 'astro';
import { jsonResponse } from '@steincms/api/json-response';
import { logCmsActivity } from '@steincms/api/log-cms-activity';
import type { ActivityLogStore } from '@steincms/cms/activity-log';

export type PostsHandlerOptions = {
	activityLog?: ActivityLogStore | null;
	postHref?: (id: string) => string;
};

export function createPostsHandler(
	store: ReturnType<typeof import('@steincms/cms/posts/posts-store').createPostsStore>,
	options: PostsHandlerOptions = {},
): { POST: APIRoute; PUT: APIRoute; DELETE: APIRoute } {
	const activityLog = options.activityLog;

	async function handleSave(request: Request, body: Record<string, unknown>, method: 'POST' | 'PUT') {
		const action = String(body.action ?? 'publish').trim();
		const id =
			String(body.id ?? '').trim() ||
			(method === 'POST' ? store.nextPostId(store.readPostRecords()) : '');

		if (!id) {
			return jsonResponse({ error: 'ID fehlt' }, 400);
		}

		if (action === 'discard-draft') {
			if (method !== 'PUT') {
				return jsonResponse({ error: 'Entwurf verwerfen nur per PUT' }, 400);
			}
			const post = await store.discardPreviewDraft(id);
			if (!post) {
				return jsonResponse({ error: 'Beitrag nicht gefunden' }, 404);
			}
			await logCmsActivity(activityLog, request, {
				kind: 'post',
				action: 'Entwurf verworfen',
				title: post.title,
				href: options.postHref?.(post.id),
			});
			return jsonResponse({ ok: true, post });
		}

		let formInput;
		try {
			formInput = store.parseFormInput(body);
		} catch (error) {
			return jsonResponse(
				{ error: error instanceof Error ? error.message : 'Ungültige Eingabe' },
				400,
			);
		}

		if (action === 'save-draft') {
			const post = await store.savePreviewDraft(id, formInput);
			await logCmsActivity(activityLog, request, {
				kind: 'draft',
				action: 'Entwurf gespeichert',
				title: post.title,
				href: options.postHref?.(post.id),
			});
			return jsonResponse({ ok: true, post });
		}

		if (action === 'publish') {
			const post = await store.publishPost(id, formInput);
			await logCmsActivity(activityLog, request, {
				kind: 'post',
				action: 'Beitrag veröffentlicht',
				title: post.title,
				href: options.postHref?.(post.id),
			});
			return jsonResponse({ ok: true, post });
		}

		return jsonResponse({ error: 'Unbekannte Aktion' }, 400);
	}

	const POST: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			return await handleSave(request, body, 'POST');
		} catch (error) {
			console.error('POST /api/posts failed:', error);
			return jsonResponse({ error: 'Failed to write data' }, 500);
		}
	};

	const PUT: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			return await handleSave(request, body, 'PUT');
		} catch (error) {
			console.error('PUT /api/posts failed:', error);
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

			const existing = store.findPostById(id);
			const removed = await store.deletePostRecord(id);
			if (!removed) {
				return jsonResponse({ error: 'Beitrag nicht gefunden' }, 404);
			}

			await logCmsActivity(activityLog, request, {
				kind: 'post',
				action: 'Beitrag gelöscht',
				title: existing?.title ?? id,
			});
			return jsonResponse({ ok: true });
		} catch (error) {
			console.error('DELETE /api/posts failed:', error);
			return jsonResponse({ error: 'Failed to delete data' }, 500);
		}
	};

	return { POST, PUT, DELETE };
}
