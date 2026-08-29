import type { APIRoute } from 'astro';
import { cms } from 'virtual:steincms';

export const prerender = false;

export const GET: APIRoute = (ctx) => {
	if (!cms.handlers.events) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.events.GET!(ctx);
};

export const POST: APIRoute = (ctx) => {
	if (!cms.handlers.events) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.events.POST!(ctx);
};

export const PUT: APIRoute = (ctx) => {
	if (!cms.handlers.events) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.events.PUT!(ctx);
};

export const DELETE: APIRoute = (ctx) => {
	if (!cms.handlers.events) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.events.DELETE!(ctx);
};
