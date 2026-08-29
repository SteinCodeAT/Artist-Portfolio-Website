/**
 * SQLite adapter for posts — maps rows ↔ PostRecord, plugs into posts-store.ts.
 * MANUAL: not generated. When you add/remove a field in content.schema.ts, update
 * rowToPost/postToRow here to match.
 */
import { requireTable, type CmsDatabase } from '../storage/db-contract';
import type { RecordListStorage } from '../storage/record-list';
import { createPostsStore, type PostRecord, type PostsStoreConfig } from './posts-store';

type PostRow = Record<string, unknown>;

function rowToPost(row: PostRow): PostRecord {
	return {
		id: row.id as string,
		slug: row.slug as string,
		title: row.title as string,
		description: row.description as string,
		blocks: (row.blocks as PostRecord['blocks']) ?? [],
		status: row.status as PostRecord['status'],
		publishedAt: (row.publishedAt as string | null) ?? null,
		createdAt: row.createdAt as string,
		updatedAt: row.updatedAt as string,
	};
}

function postToRow(post: PostRecord): PostRow {
	return {
		id: post.id,
		slug: post.slug,
		title: post.title,
		description: post.description,
		blocks: post.blocks,
		status: post.status,
		publishedAt: post.publishedAt,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
	};
}

export function postRecordListStorage(database: CmsDatabase): RecordListStorage<PostRecord> {
	const table = requireTable(database, 'posts');
	const db = database.open();
	return {
		readAll: () => {
			const rows = db.select().from(table).all() as PostRow[];
			return rows.map(rowToPost);
		},
		writeAll: (records) => {
			db.transaction((tx) => {
				tx.delete(table).run();
				for (const post of records) {
					tx.insert(table).values(postToRow(post)).run();
				}
			});
		},
	};
}

export function createPostsStoreWithDatabase(config: PostsStoreConfig, database: CmsDatabase) {
	return createPostsStore(config, postRecordListStorage(database));
}
