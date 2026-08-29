import type { APIRoute } from 'astro';
import { cms } from 'virtual:steincms';

export const prerender = false;

export const POST: APIRoute = (ctx) => cms.handlers.upload(ctx);
