import type { APIRoute } from 'astro';
import { cms } from 'virtual:steincms';

export const prerender = false;

export const POST: APIRoute = (ctx) => {
	if (!cms.handlers.posts) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.posts.POST!(ctx);
};

export const PUT: APIRoute = (ctx) => {
	if (!cms.handlers.posts) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.posts.PUT!(ctx);
};

export const DELETE: APIRoute = (ctx) => {
	if (!cms.handlers.posts) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.posts.DELETE!(ctx);
};
