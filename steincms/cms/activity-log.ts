/**
 * Shared types for the admin activity log — kept separate from
 * activity-log.database.ts (the SQLite adapter, and the only implementation
 * every project actually uses) so both have one home.
 */

export type ActivityKind = 'event' | 'draft' | 'post' | 'page';

export type ActivityLogEntry = {
	id: string;
	at: string;
	username: string;
	displayName: string;
	kind: ActivityKind;
	action: string;
	title: string;
	href?: string;
};

export type ActivityLogStore = {
	append: (entry: Omit<ActivityLogEntry, 'id' | 'at'> & { at?: string }) => Promise<ActivityLogEntry>;
	readRecent: (limit?: number) => ActivityLogEntry[];
	filePath: string;
};
