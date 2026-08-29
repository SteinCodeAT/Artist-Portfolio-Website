import type { APIRoute } from 'astro';
import { cms } from 'virtual:steincms';

export const prerender = false;

export const POST: APIRoute = (ctx) => {
	if (!cms.handlers.clearRegistrations) {
		return new Response(JSON.stringify({ error: 'Not configured' }), { status: 404 });
	}
	return cms.handlers.clearRegistrations.POST!(ctx);
};
