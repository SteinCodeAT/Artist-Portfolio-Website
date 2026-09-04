// Serves everything under public/media/ (CMS-uploaded cover images, gallery
// images, thumbnails) from disk on every request, instead of letting Astro's
// build copy it into dist/client/media and serve that frozen snapshot.
//
// Why this route exists at all: on `astro build`, Astro copies public/ into
// dist/client/ once, and the @astrojs/node standalone adapter's production
// server serves static assets straight out of dist/client/ from then on. The
// CMS media store (steincms/cms/media/media-store.ts) keeps writing new
// uploads into public/media/ at runtime — the *source* directory — which the
// already-built dist/client/ copy never sees again. The admin API and DB
// update correctly, but the actual image bytes the browser requests keep
// coming from whatever was in dist/client/media at the last build: a cover
// image looks like it can't be changed or removed, because on production it
// genuinely can't, short of a full rebuild + redeploy. This route reads
// public/media/ directly at request time so uploads are visible immediately,
// matching how `astro dev` already behaves (Vite serves public/ live there,
// which is why this never reproduced in dev).
export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

const MEDIA_ROOT = path.join(process.cwd(), 'public', 'media');

const MIME_TYPES: Record<string, string> = {
	'.webp': 'image/webp',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.avif': 'image/avif',
};

function resolveSafePath(relPath: string): string | null {
	const segments = relPath.split('/').filter(Boolean);
	if (segments.some((segment) => segment === '..' || segment === '.')) {
		return null;
	}
	const filePath = path.join(MEDIA_ROOT, ...segments);
	// Defense in depth beyond the ".." check above, in case of odd platform
	// path resolution — the final path must still live under MEDIA_ROOT.
	if (filePath !== MEDIA_ROOT && !filePath.startsWith(MEDIA_ROOT + path.sep)) {
		return null;
	}
	return filePath;
}

export const GET: APIRoute = async ({ params, request }) => {
	const relPath = params.path;
	if (!relPath) {
		return new Response('Not found', { status: 404 });
	}

	const filePath = resolveSafePath(relPath);
	if (!filePath) {
		return new Response('Not found', { status: 404 });
	}

	let stat;
	try {
		stat = await fs.promises.stat(filePath);
	} catch {
		return new Response('Not found', { status: 404 });
	}
	if (!stat.isFile()) {
		return new Response('Not found', { status: 404 });
	}

	const etag = `W/"${stat.size}-${stat.mtimeMs}"`;
	const lastModified = stat.mtime.toUTCString();

	// Conditional GET — same revalidation contract the static file server
	// gave for free, so browsers/proxies keep behaving as before.
	const ifNoneMatch = request.headers.get('if-none-match');
	if (ifNoneMatch === etag) {
		return new Response(null, {
			status: 304,
			headers: { ETag: etag, 'Last-Modified': lastModified, 'Cache-Control': 'no-cache' },
		});
	}

	const ext = path.extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
	const data = await fs.promises.readFile(filePath);

	return new Response(data, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(stat.size),
			'Last-Modified': lastModified,
			ETag: etag,
			// Must revalidate every time (not a long max-age): the whole point
			// is that a cover image can change at any moment via the admin.
			'Cache-Control': 'no-cache',
		},
	});
};
