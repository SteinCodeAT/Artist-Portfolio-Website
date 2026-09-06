/**
 * One-off: extract gallery/image blocks from post.blocks into post.mainGallery.
 *
 * Dry-run (default):
 *   npx tsx scripts/migrate-project-galleries.ts
 *
 * Apply:
 *   npx tsx scripts/migrate-project-galleries.ts --apply
 *
 * Copy data/admin_cms.sqlite (or DATABASE_URL) first. Re-running after apply is a no-op.
 */
import { eq } from 'drizzle-orm';
import { cmsDatabase } from '../src/db/cms-database';
import { posts } from '../src/db/schema/generated/posts';

const apply = process.argv.includes('--apply');

type Block = {
	type?: string;
	url?: string;
	images?: Array<{ url?: string }>;
};

type PostRow = {
	id: string;
	slug: string;
	title: string;
	blocks: unknown;
	mainGallery: string[] | null;
};

function extractPhotoUrls(blocks: Block[]): { urls: string[]; remaining: Block[]; removed: number } {
	const urls: string[] = [];
	const remaining: Block[] = [];
	let removed = 0;

	for (const block of blocks) {
		if (block.type === 'gallery') {
			removed += 1;
			for (const image of block.images ?? []) {
				const url = String(image.url ?? '').trim();
				if (url) urls.push(url);
			}
			continue;
		}
		if (block.type === 'image') {
			removed += 1;
			const url = String(block.url ?? '').trim();
			if (url) urls.push(url);
			continue;
		}
		remaining.push(block);
	}

	return { urls, remaining, removed };
}

function mergeUnique(existing: string[], extracted: string[]): string[] {
	const seen = new Set(existing);
	const merged = [...existing];
	for (const url of extracted) {
		if (seen.has(url)) continue;
		seen.add(url);
		merged.push(url);
	}
	return merged;
}

const db = cmsDatabase.open();
const rows = db.select().from(posts).all() as PostRow[];

let changed = 0;
let skipped = 0;

console.log(apply ? 'APPLY — writing changes\n' : 'DRY-RUN — no writes\n');

for (const row of rows) {
	const blocks = Array.isArray(row.blocks) ? (row.blocks as Block[]) : [];
	const currentGallery = Array.isArray(row.mainGallery) ? row.mainGallery : [];
	const { urls, remaining, removed } = extractPhotoUrls(blocks);

	if (removed === 0 && urls.length === 0) {
		skipped += 1;
		console.log(`SKIP  ${row.slug} — no photo blocks (mainGallery=${currentGallery.length})`);
		continue;
	}

	const nextGallery = currentGallery.length > 0 ? mergeUnique(currentGallery, urls) : urls;
	const appended = nextGallery.length - currentGallery.length;

	console.log(
		`MOVE  ${row.slug} — extract ${urls.length} url(s), strip ${removed} block(s), ` +
			`mainGallery ${currentGallery.length} → ${nextGallery.length}` +
			(appended > 0 ? ` (+${appended} new)` : ''),
	);

	if (!apply) {
		changed += 1;
		continue;
	}

	(
		db as unknown as {
			update: (table: typeof posts) => {
				set: (v: object) => { where: (w: unknown) => { run: () => void } };
			};
		}
	)
		.update(posts)
		.set({
			blocks: remaining,
			mainGallery: nextGallery,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(posts.id, row.id))
		.run();

	changed += 1;
}

console.log(
	`\n${apply ? 'Updated' : 'Would update'} ${changed} project(s); skipped ${skipped}.` +
		(apply ? '' : '\nRe-run with --apply to write.'),
);
