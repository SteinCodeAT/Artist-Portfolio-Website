// Opens the SQLite connection. Kept separate from cms-database.generated.ts
// so the DB engine choice lives in exactly one project-owned file.
//
// Must be synchronous: every steincms/cms/*-store.database.ts file calls
// db.select()....all() / .get() / .run() directly, never awaited. That rules
// out drizzle-orm/libsql (its @libsql/client is Promise-based even for local
// files) — better-sqlite3 is the driver steincms's whole DB layer assumes.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

let db: ReturnType<typeof drizzle> | null = null;

// Name matters: generate-db-wiring.ts hard-codes `import { getDb } from './client'`.
export function getDb() {
	if (!db) {
		// import.meta.env only exists under Astro/Vite — guard it so plain `tsx`
		// scripts (npm run db:*, one-off imports) can use this file too.
		const url = (typeof import.meta.env !== 'undefined' ? import.meta.env.DATABASE_URL : undefined)
			?? process.env.DATABASE_URL
			?? './data/admin_cms.sqlite';
		const sqlite = new Database(url);
		sqlite.pragma('journal_mode = WAL');
		db = drizzle(sqlite);
	}
	return db;
}
