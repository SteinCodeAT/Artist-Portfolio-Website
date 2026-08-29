import type { APIRoute } from 'astro';
import { cms } from 'virtual:steincms';

export const prerender = false;

export const GET: APIRoute = (ctx) => {
	if (!cms.handlers.content) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.content.GET!(ctx);
};

export const POST: APIRoute = (ctx) => {
	if (!cms.handlers.content) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.content.POST!(ctx);
};
