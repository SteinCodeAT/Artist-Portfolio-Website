/**
 * The database CONTRACT every store in steincms/ is written against — not a
 * database itself and nothing here opens a connection. A project's real
 * Drizzle client (src/db/client.ts) is cast to `DatabaseConnection` at the
 * boundary in the generated src/db/cms-database.generated.ts, so steincms/
 * stays decoupled from Drizzle specifics (useful if the DB engine ever
 * changes). `requireTable` is the lookup helper every `*-store.database.ts`
 * adapter uses to grab its table out of `CmsDatabase.tables`.
 */

type QueryResult = {
	all: () => unknown[];
	get: () => Record<string, unknown> | undefined;
	run: () => void;
};

type SelectQuery = QueryResult & {
	where: (...args: unknown[]) => QueryResult;
	orderBy: (...args: unknown[]) => SelectQuery;
	limit: (n: number) => QueryResult;
	offset: (n: number) => SelectQuery;
};

/** Minimal query surface steincms stores use (Drizzle is cast to this at project boundary). */
export type DatabaseConnection = {
	select: (...args: unknown[]) => { from: (table: unknown) => SelectQuery };
	insert: (table: unknown) => { values: (row: unknown) => QueryResult };
	delete: (table: unknown) => QueryResult & { where: (...args: unknown[]) => QueryResult };
	transaction: (fn: (tx: DatabaseConnection) => void) => void;
};

/** Passed from project src/db/cms-database.generated.ts into createCms(). */
export type CmsDatabase = {
	open: () => DatabaseConnection;
	tables: Record<string, unknown>;
};

export const SINGLETONS_TABLE = 'singletons';
export const REGISTRATIONS_TABLE = 'registrations';

export function requireTable(database: CmsDatabase, key: string): unknown {
	const table = database.tables[key];
	if (!table) throw new Error(`Missing table "${key}". Run npm run db:sync-schema.`);
	return table;
}
