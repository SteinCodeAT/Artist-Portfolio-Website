// Entry point for `npm run db:sync-schema`. Reads content.schema.ts, writes
// src/db/schema/generated/* and src/db/cms-database.generated.ts.
import { generateDbSchemas } from '@steincms/db';
import { contentSchema } from '../src/content.schema';

const result = generateDbSchemas({
	contentSchema,
	schemaDir: 'src/db/schema',
	dbDir: 'src/db',
});

console.log('Synced schema.');
console.log('  Collections:', result.listCollections.join(', ') || '(none)');
console.log('  Singletons:', result.singletons.join(', ') || '(none)');
console.log('  Files written:', result.writtenFiles.length);
