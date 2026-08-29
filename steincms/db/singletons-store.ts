/**
 * Read/write singleton pages (membership, homepage, …) in the shared singletons table.
 * Row key = collection id from content.schema.ts (e.g. "membership").
 */
import { eq, type SQLWrapper } from 'drizzle-orm';
import { readSteinCMSManifest } from '@steincms/cms/manifest';
import { requireTable, SINGLETONS_TABLE, type CmsDatabase } from '../cms/storage/db-contract';
import type { z } from 'zod';

function eqColumn(column: unknown, value: unknown) {
	return eq(column as SQLWrapper, value);
}

export function readValidateSingleton<T extends Record<string, unknown>>(
	database: CmsDatabase,
	key: string,
	schema: z.ZodTypeAny,
): T {
	const raw = readSingleton(database, key);
	if (!raw) throw new Error(`Singleton "${key}" not found in database`);
	const parsed = schema.safeParse(raw);
	if (!parsed.success) throw new Error(parsed.error.message);
	return parsed.data as T;
}

export function writeValidateSingleton(
	database: CmsDatabase,
	key: string,
	schema: z.ZodTypeAny,
	data: Record<string, unknown>,
): void {
	const parsed = schema.safeParse(data);
	if (!parsed.success) throw new Error(parsed.error.message);
	writeSingleton(database, key, parsed.data as Record<string, unknown>);
}

export function readSingleton(database: CmsDatabase, key: string): Record<string, unknown> | null {
	const table = requireTable(database, SINGLETONS_TABLE) as { key: unknown; data: unknown };
	const row = database.open().select().from(table).where(eqColumn(table.key, key)).get() as
		| { data: Record<string, unknown> }
		| undefined;
	return row?.data ?? null;
}

export function writeSingleton(database: CmsDatabase, key: string, data: Record<string, unknown>): void {
	const manifest = readSteinCMSManifest();
	const table = requireTable(database, SINGLETONS_TABLE) as {
		key: unknown;
		schemaVersion: unknown;
		data: unknown;
	};
	database.open().delete(table).where(eqColumn(table.key, key)).run();
	database.open()
		.insert(table)
		.values({ key, schemaVersion: manifest.contentSchemaVersion, data })
		.run();
}
