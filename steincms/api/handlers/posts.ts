import type { APIRoute } from 'astro';
import type { PostStatus } from '@steincms/cms/posts/posts-store';
import { jsonResponse } from '@steincms/api/json-response';
import { logCmsActivity } from '@steincms/api/log-cms-activity';
import type { ActivityLogStore } from '@steincms/cms/activity-log';

function parseStatus(value: unknown): PostStatus | undefined {
	if (value === 'draft' || value === 'published') {
		return value;
	}
	return undefined;
}

export type PostsHandlerOptions = {
	activityLog?: ActivityLogStore | null;
	postHref?: (id: string) => string;
};

export function createPostsHandler(
	store: ReturnType<typeof import('@steincms/cms/posts/posts-store').createPostsStore>,
	options: PostsHandlerOptions = {},
): { POST: APIRoute; PUT: APIRoute; DELETE: APIRoute } {
	const activityLog = options.activityLog;

	const POST: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			const title = String(body.title ?? '').trim();
			const description = String(body.description ?? '').trim();
			const status = parseStatus(body.status) ?? 'draft';

			if (!title) {
				return jsonResponse({ error: 'Titel fehlt' }, 400);
			}

			let blocks;
			try {
				blocks = store.validateAndSanitizeBlocks(body.blocks ?? []);
			} catch (error) {
				return jsonResponse(
					{ error: error instanceof Error ? error.message : 'Ungültige Blöcke' },
					400,
				);
			}

			let mainImage: string | null | undefined;
			if (body.mainImage !== undefined) {
				try {
					mainImage = store.parseMainImage(body.mainImage);
				} catch (error) {
					return jsonResponse(
						{ error: error instanceof Error ? error.message : 'Ungültiges Hauptbild' },
						400,
					);
				}
			}

			let publishedAt: string | null | undefined;
			if (body.publishedAt !== undefined) {
				try {
					publishedAt = store.parsePublishedAt(body.publishedAt);
				} catch (error) {
					return jsonResponse(
						{ error: error instanceof Error ? error.message : 'Ungültiges Datum' },
						400,
					);
				}
			}

			const post = await store.appendPostRecord({
				id: String(body.id ?? '').trim() || undefined,
				title,
				description,
				blocks,
				status,
				...(mainImage !== undefined ? { mainImage } : {}),
				...(publishedAt !== undefined ? { publishedAt } : {}),
			});
			await logCmsActivity(activityLog, request, {
				kind: 'post',
				action: status === 'published' ? 'Beitrag veröffentlicht' : 'Beitrag angelegt',
				title: post.title,
				href: options.postHref?.(post.id),
			});
			return jsonResponse({ ok: true, post });
		} catch (error) {
			console.error('POST /api/posts failed:', error);
			return jsonResponse({ error: 'Failed to write data' }, 500);
		}
	};

	const PUT: APIRoute = async ({ request }) => {
		try {
			const body = (await request.json()) as Record<string, unknown>;
			const id = String(body.id ?? '').trim();
			const title = body.title !== undefined ? String(body.title).trim() : undefined;
			const description =
				body.description !== undefined ? String(body.description).trim() : undefined;
			const status = parseStatus(body.status);

			if (!id) {
				return jsonResponse({ error: 'ID fehlt' }, 400);
			}

			if (title === '') {
				return jsonResponse({ error: 'Titel fehlt' }, 400);
			}

			let blocks;
			if (body.blocks !== undefined) {
				try {
					blocks = store.validateAndSanitizeBlocks(body.blocks);
				} catch (error) {
					return jsonResponse(
						{ error: error instanceof Error ? error.message : 'Ungültige Blöcke' },
						400,
					);
				}
			}

			let mainImage: string | null | undefined;
			if (body.mainImage !== undefined) {
				try {
					mainImage = store.parseMainImage(body.mainImage);
				} catch (error) {
					return jsonResponse(
						{ error: error instanceof Error ? error.message : 'Ungültiges Hauptbild' },
						400,
					);
				}
			}

			let publishedAt: string | null | undefined;
			if (body.publishedAt !== undefined) {
				try {
					publishedAt = store.parsePublishedAt(body.publishedAt);
				} catch (error) {
					return jsonResponse(
						{ error: error instanceof Error ? error.message : 'Ungültiges Datum' },
						400,
					);
				}
			}

			const post = await store.updatePostRecord(id, {
				...(title !== undefined ? { title } : {}),
				...(description !== undefined ? { description } : {}),
				...(blocks !== undefined ? { blocks } : {}),
				...(status !== undefined ? { status } : {}),
				...(mainImage !== undefined ? { mainImage } : {}),
				...(publishedAt !== undefined ? { publishedAt } : {}),
			});

			if (!post) {
				return jsonResponse({ error: 'Beitrag nicht gefunden' }, 404);
			}

			await logCmsActivity(activityLog, request, {
				kind: 'post',
				action:
					status === 'published' ? 'Beitrag veröffentlicht' : 'Beitrag aktualisiert',
				title: post.title,
				href: options.postHref?.(post.id),
			});
			return jsonResponse({ ok: true, post });
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
