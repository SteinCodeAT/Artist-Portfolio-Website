/**
 * SQLite adapter for the admin activity log — the only implementation any
 * project uses (activity-log.ts holds just the shared types). Table schema
 * lives in @steincms/db/schema/activity-log, not the generated per-collection
 * tables, since the activity log isn't a content.schema.ts collection.
 */
import { desc, lt } from 'drizzle-orm';
import { createUuidV7 } from '@steincms/cms/core/uuid';
import type { ActivityLogEntry, ActivityLogStore } from '@steincms/cms/activity-log';
import { activityLog } from '@steincms/db/schema/activity-log';
import type { CmsDatabase } from './storage/db-contract';

const MAX_ENTRIES = 200;

export function createActivityLogStoreWithDatabase(database: CmsDatabase): ActivityLogStore {
	function readRecent(limit = 20): ActivityLogEntry[] {
		return database.open()
			.select()
			.from(activityLog)
			.orderBy(desc(activityLog.at))
			.limit(Math.max(1, limit))
			.all() as ActivityLogEntry[];
	}

	async function append(
		entry: Omit<ActivityLogEntry, 'id' | 'at'> & { at?: string },
	): Promise<ActivityLogEntry> {
		const record: ActivityLogEntry = {
			id: createUuidV7(),
			at: entry.at ?? new Date().toISOString(),
			username: entry.username,
			displayName: entry.displayName,
			kind: entry.kind,
			action: entry.action,
			title: entry.title,
			...(entry.href ? { href: entry.href } : {}),
		};

		const db = database.open();
		db.transaction(() => {
			db.insert(activityLog).values(record).run();
			const cutoff = db
				.select({ at: activityLog.at })
				.from(activityLog)
				.orderBy(desc(activityLog.at))
				.offset(MAX_ENTRIES)
				.limit(1)
				.get()?.at as string | undefined;
			if (cutoff) db.delete(activityLog).where(lt(activityLog.at, cutoff)).run();
		});

		return record;
	}

	return { append, readRecent, filePath: 'database:activity_log' };
}
