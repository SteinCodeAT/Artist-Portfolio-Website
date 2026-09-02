/**
 * Convert existing public/media originals (jpg/png/…) to the same WebP
 * pipeline the admin upload uses, rewrite post URLs, then delete the raw files.
 *
 * Run: npx tsx scripts/compress-public-media.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { posts } from '../src/db/schema/generated/posts';
import { createMediaConfig, type MediaContentType } from '../steincms/cms/media/media-store';
import { processImageToSlot, type ImagePreset } from '../steincms/cms/media/image-processor';

const RAW_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif']);
const mediaConfig = createMediaConfig({ root: 'public/media', urlPrefix: '/media' });
const mediaRoot = mediaConfig.root;

function rewriteStrings(value: unknown, map: Map<string, string>): unknown {
	if (typeof value === 'string') return map.get(value) ?? value;
	if (Array.isArray(value)) return value.map((item) => rewriteStrings(item, map));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
				key,
				rewriteStrings(nested, map),
			]),
		);
	}
	return value;
}

function listRawFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const out: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...listRawFiles(full));
			continue;
		}
		const ext = path.extname(entry.name).toLowerCase();
		if (RAW_EXT.has(ext) && !entry.name.toLowerCase().includes('-thumb.')) {
			out.push(full);
		}
	}
	return out;
}

async function main() {
	const files = listRawFiles(mediaRoot);
	if (files.length === 0) {
		console.log('No raw images under public/media.');
		return;
	}

	const db = getDb();
	const rows = db.select().from(posts).all();
	const mainImageUrls = new Set(
		rows.map((row) => row.mainImage).filter((url): url is string => Boolean(url)),
	);

	const urlMap = new Map<string, string>();

	for (const filePath of files) {
		const rel = path.relative(mediaRoot, filePath).replaceAll('\\', '/');
		const parts = rel.split('/');
		const type = parts[0] as MediaContentType;
		const entryId = parts[1];
		const filename = parts.slice(2).join('/');
		if ((type !== 'posts' && type !== 'events') || !entryId || !filename) {
			console.warn('Skip unexpected path:', rel);
			continue;
		}

		const webpName = `${path.parse(filename).name}.webp`;
		const oldUrl = `/media/${type}/${entryId}/${filename}`;
		const newUrl = `/media/${type}/${entryId}/${webpName}`;
		const preset: ImagePreset = mainImageUrls.has(oldUrl) ? 'cover' : 'gallery';

		const buffer = fs.readFileSync(filePath);
		await processImageToSlot(buffer, mediaConfig, type, entryId, webpName, preset);
		fs.unlinkSync(filePath);
		urlMap.set(oldUrl, newUrl);
		console.log(`${rel} -> ${webpName} (${preset})`);
	}

	for (const row of rows) {
		const nextMain = row.mainImage ? (urlMap.get(row.mainImage) ?? row.mainImage) : row.mainImage;
		const nextBlocks = rewriteStrings(row.blocks, urlMap);
		db.update(posts)
			.set({ mainImage: nextMain, blocks: nextBlocks })
			.where(eq(posts.id, row.id))
			.run();
	}

	console.log(`\nConverted ${urlMap.size} files. Raw originals removed from public/media.`);
}

void main();
