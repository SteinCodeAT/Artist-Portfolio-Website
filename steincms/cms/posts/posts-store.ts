/**
 * Business logic for posts — validation, slugs, ids, block sanitizing.
 * Storage-agnostic: reads/writes go through the injected `RecordListStorage`
 * (see posts-store.database.ts, the SQLite adapter every project actually
 * uses). `lockFilePath` has nothing to do with where data lives — it just
 * gives concurrent writes to this collection a stable file to lock on.
 */
import { validateTableBlockFields } from '@steincms/cms/blocks/table-block';
import { createFileStore } from '@steincms/cms/core/file-store';
import { ensureUniqueSlug, slugify } from '@steincms/cms/core/slug';
import { sanitizeHtml } from '@steincms/cms/core/sanitize-html';
import { createUuidV7 } from '@steincms/cms/core/uuid';
import { deleteEntryMedia, isMediaUrl, type MediaConfig } from '@steincms/cms/media/media-store';
import type { RecordListStorage } from '@steincms/cms/storage/record-list';

export type TextBlock = {
	id: string;
	type: 'text';
	html: string;
};

export type ImageBlock = {
	id: string;
	type: 'image';
	url: string;
	alt: string;
	caption?: string;
};

export type GalleryImage = {
	id: string;
	url: string;
	thumbUrl: string;
	alt?: string;
};

export type GalleryBlock = {
	id: string;
	type: 'gallery';
	images: GalleryImage[];
};

export type TableBlock = {
	id: string;
	type: 'table';
	hasHeaderRow: boolean;
	rows: string[][];
};

export type ContentBlock = TextBlock | ImageBlock | GalleryBlock | TableBlock;
export type PostStatus = 'draft' | 'published';

export type PostRecord = {
	id: string;
	slug: string;
	title: string;
	description: string;
	mainImage?: string | null;
	blocks: ContentBlock[];
	year: string | null;
	status: PostStatus;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CreatePostInput = {
	id?: string;
	title: string;
	description: string;
	mainImage?: string | null;
	blocks: ContentBlock[];
	year: string | null;
	status?: PostStatus;
	publishedAt?: string | null;
};

export type UpdatePostInput = {
	title?: string;
	description?: string;
	mainImage?: string | null;
	blocks?: ContentBlock[];
	year?: string | null;
	status?: PostStatus;
	publishedAt?: string | null;
};

export type PostsStoreConfig = {
	/** Stable per-collection path used only to serialize concurrent writes (see core/file-store.ts). Not a data file. */
	lockFilePath: string;
	mediaConfig: MediaConfig;
};

function isValidImageUrl(url: string, mediaConfig: MediaConfig): boolean {
	return isMediaUrl(url, mediaConfig) && !url.includes('..');
}

export function createPostsStore(config: PostsStoreConfig, storage: RecordListStorage<PostRecord>) {
	const store = createFileStore(config.lockFilePath);

	function readPostRecords(): PostRecord[] {
		return storage.readAll();
	}

	function writePostRecords(posts: PostRecord[]): void {
		storage.writeAll(posts);
	}

	function parseMainImage(value: unknown): string | null | undefined {
		if (value === undefined) {
			return undefined;
		}
		if (value === null) {
			return null;
		}

		const url = String(value).trim();
		if (!url) {
			return null;
		}
		if (!isValidImageUrl(url, config.mediaConfig)) {
			throw new Error('Invalid main image URL');
		}
		return url;
	}

	function validateAndSanitizeBlocks(raw: unknown): ContentBlock[] {
		if (!Array.isArray(raw)) {
			throw new Error('blocks must be an array');
		}

		return raw.map((item, index) => {
			if (!item || typeof item !== 'object') {
				throw new Error(`Block ${index + 1} is invalid`);
			}

			const block = item as Record<string, unknown>;
			const id = String(block.id ?? '').trim();
			const type = String(block.type ?? '').trim();

			if (!id) {
				throw new Error(`Block ${index + 1} is missing an id`);
			}

			if (type === 'text') {
				const html = sanitizeHtml(String(block.html ?? ''));
				return { id, type: 'text', html } satisfies TextBlock;
			}

			if (type === 'image') {
				const url = String(block.url ?? '').trim();
				const alt = String(block.alt ?? '').trim();
				const captionRaw = block.caption;
				const caption =
					captionRaw === undefined || captionRaw === null
						? undefined
						: String(captionRaw).trim();

				if (!url || !isValidImageUrl(url, config.mediaConfig)) {
					throw new Error(`Block ${index + 1}: invalid image URL`);
				}
				if (!alt) {
					throw new Error(`Block ${index + 1}: alt text is required`);
				}

				return {
					id,
					type: 'image',
					url,
					alt,
					...(caption ? { caption } : {}),
				} satisfies ImageBlock;
			}

			if (type === 'gallery') {
				const rawImages = block.images;
				if (!Array.isArray(rawImages) || rawImages.length === 0) {
					throw new Error(`Block ${index + 1}: gallery requires at least one image`);
				}

				const images: GalleryImage[] = rawImages.map((rawImage, imageIndex) => {
					if (!rawImage || typeof rawImage !== 'object') {
						throw new Error(`Block ${index + 1}, image ${imageIndex + 1}: invalid`);
					}

					const image = rawImage as Record<string, unknown>;
					const imageId = String(image.id ?? '').trim();
					const url = String(image.url ?? '').trim();
					const thumbUrl = String(image.thumbUrl ?? url).trim();
					const altRaw = image.alt;
					const alt =
						altRaw === undefined || altRaw === null ? undefined : String(altRaw).trim();

					if (!imageId) {
						throw new Error(`Block ${index + 1}, image ${imageIndex + 1}: missing id`);
					}
					if (!url || !isValidImageUrl(url, config.mediaConfig)) {
						throw new Error(`Block ${index + 1}, image ${imageIndex + 1}: invalid URL`);
					}
					if (!thumbUrl || !isValidImageUrl(thumbUrl, config.mediaConfig)) {
						throw new Error(`Block ${index + 1}, image ${imageIndex + 1}: invalid thumb URL`);
					}

					return {
						id: imageId,
						url,
						thumbUrl,
						...(alt ? { alt } : {}),
					};
				});

				return { id, type: 'gallery', images } satisfies GalleryBlock;
			}

			if (type === 'table') {
				const tableFields = validateTableBlockFields(block, index);
				return { id, type: 'table', ...tableFields } satisfies TableBlock;
			}

			throw new Error(`Block ${index + 1}: unknown type "${type}"`);
		});
	}

	function loadPosts(): PostRecord[] {
		return readPostRecords().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	function loadPublishedPosts(): PostRecord[] {
		return loadPosts()
			.filter((post) => post.status === 'published')
			.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
	}

	function findPostBySlug(slug: string): PostRecord | undefined {
		return readPostRecords().find((post) => post.slug === slug);
	}

	function findPostById(id: string): PostRecord | undefined {
		return readPostRecords().find((post) => post.id === id);
	}

	function nextPostId(_posts: PostRecord[]): string {
		return createUuidV7();
	}

	function parsePublishedAt(value: unknown): string | null | undefined {
		if (value === undefined) {
			return undefined;
		}
		if (value === null || value === '') {
			return null;
		}

		const iso = String(value).trim();
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) {
			throw new Error('Ungültiges Veröffentlichungsdatum');
		}

		return date.toISOString();
	}

	function resolvePublishedAt(
		current: string | null,
		nextStatus: PostStatus,
		explicit?: string | null,
	): string | null {
		if (nextStatus !== 'published') {
			return current;
		}
		if (explicit !== undefined) {
			return explicit ?? new Date().toISOString();
		}
		return current ?? new Date().toISOString();
	}

	function appendPostRecord(input: CreatePostInput): Promise<PostRecord> {
		return store.runWithLock(() => {
			const existing = readPostRecords();
			const now = new Date().toISOString();
			const status = input.status ?? 'draft';
			const baseSlug = slugify(input.title);
			const slug = ensureUniqueSlug(
				baseSlug,
				existing.map((post) => post.slug),
			);

			const newPost: PostRecord = {
				id: input.id ?? nextPostId(existing),
				slug,
				title: input.title,
				description: input.description,
				...(input.mainImage ? { mainImage: input.mainImage } : {}),
				blocks: input.blocks,
				status,
				year: input.year?.trim() || null,
				publishedAt:
					status === 'published'
						? resolvePublishedAt(null, 'published', input.publishedAt)
						: null,
				createdAt: now,
				updatedAt: now,
			};

			writePostRecords([...existing, newPost]);
			return newPost;
		});
	}

	function updatePostRecord(id: string, patch: UpdatePostInput): Promise<PostRecord | null> {
		return store.runWithLock(() => {
			const existing = readPostRecords();
			const index = existing.findIndex((post) => post.id === id);
			if (index === -1) {
				return null;
			}

			const current = existing[index];
			const nextTitle = patch.title ?? current.title;
			const nextStatus = patch.status ?? current.status;

			let nextSlug = current.slug;
			if (patch.title && patch.title !== current.title) {
				const baseSlug = slugify(nextTitle);
				nextSlug = ensureUniqueSlug(
					baseSlug,
					existing.map((post) => post.slug),
					current.slug,
				);
			}

			const nextMainImage =
				patch.mainImage !== undefined ? patch.mainImage : (current.mainImage ?? null);

			const updatedPost: PostRecord = {
				...current,
				title: nextTitle,
				description: patch.description ?? current.description,
				blocks: patch.blocks ?? current.blocks,
				status: nextStatus,
				slug: nextSlug,
				year: patch.year !== undefined ? (patch.year?.trim() || null) : (current.year ?? null),
				publishedAt: resolvePublishedAt(
					current.publishedAt,
					nextStatus,
					patch.publishedAt,
				),
				updatedAt: new Date().toISOString(),
				...(nextMainImage ? { mainImage: nextMainImage } : {}),
			};

			if (!nextMainImage) {
				delete updatedPost.mainImage;
			}

			const updated = [...existing];
			updated[index] = updatedPost;
			writePostRecords(updated);
			return updatedPost;
		});
	}

	function deletePostRecord(id: string): Promise<boolean> {
		return store.runWithLock(() => {
			const existing = readPostRecords();
			const filtered = existing.filter((post) => post.id !== id);
			if (filtered.length === existing.length) {
				return false;
			}
			writePostRecords(filtered);
			deleteEntryMedia(config.mediaConfig, 'posts', id);
			return true;
		});
	}

	return {
		readPostRecords,
		loadPosts,
		loadPublishedPosts,
		findPostBySlug,
		findPostById,
		parseMainImage,
		validateAndSanitizeBlocks,
		parsePublishedAt,
		appendPostRecord,
		updatePostRecord,
		deletePostRecord,
		nextPostId,
	};
}
