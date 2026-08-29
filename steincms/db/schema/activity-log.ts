import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const activityLog = sqliteTable(
	'activity_log',
	{
		id: text('id').primaryKey(),
		at: text('at'),
		username: text('username'),
		displayName: text('display_name'),
		kind: text('kind'),
		action: text('action'),
		title: text('title'),
		href: text('href'),
	},
	(table) => [index('activity_log_at_idx').on(table.at)],
);
