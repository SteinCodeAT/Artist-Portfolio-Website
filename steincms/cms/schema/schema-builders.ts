/**
 * The API you call while writing a project's `content.schema.ts`.
 *
 * Two concepts, composed:
 *  - Record  = the shape of ONE entry: its fields (`defineRecord({ fields: {...} })`,
 *              built from the field helpers in `./fields`). Just data shape, no storage.
 *  - Collection = how a record is stored and administered: `defineListCollection(...)`
 *              for many rows (events, posts, ...), `defineSingleton(...)` for exactly
 *              one row (a static page like membership). This is what `db:sync-schema`
 *              reads to generate Drizzle tables (see steincms/db/DATABASE.md).
 */
import { z } from 'zod';
import type { FieldDef } from './fields/types';
import type { CollectionKind } from '@steincms/cms/content-envelope';

// ---- Record: the fields of one entry --------------------------------------

export type RecordFields = Record<string, FieldDef>;

export type RecordDef = {
	fields: RecordFields;
	schema: z.ZodObject<z.ZodRawShape>;
};

export type DefineRecordInput = {
	fields: Record<string, FieldDef>;
};

export function compileRecordSchema(fields: RecordFields): z.ZodObject<z.ZodRawShape> {
	// Built as a plain mutable record, then handed to z.object() — newer Zod
	// versions type ZodRawShape itself as read-only.
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const [name, field] of Object.entries(fields)) {
		shape[name] = field.zod;
	}
	return z.object(shape);
}

export function defineRecord(input: DefineRecordInput): RecordDef {
	const fields: RecordFields = {};
	for (const [name, field] of Object.entries(input.fields)) {
		fields[name] = { ...field, name };
	}
	return {
		fields,
		schema: compileRecordSchema(fields),
	};
}

export function getRecordFields(record: RecordDef): FieldDef[] {
	return Object.values(record.fields);
}

// ---- Collection: how a record is stored & administered ---------------------

export type AdminEditorProfile = 'event' | 'post-blocks' | 'custom' | 'schema-form' | 'simple-list';

export type CollectionAdminConfig = {
	editor: AdminEditorProfile;
	label?: string;
	section?: string;
	route?: string;
	routes?: Record<string, string>;
};

type CollectionDefBase = {
	/**
	 * Path to this collection's pre-DB JSON file, used only by the one-time
	 * `npm run db:import-json` migration and by `cms:migrate`/`cms:status`.
	 * Omit for a collection that starts empty in the database — nothing at
	 * runtime reads this.
	 */
	jsonImportPath?: string;
	record: RecordDef;
	schema: z.ZodTypeAny;
	admin: CollectionAdminConfig;
};

export type ListCollectionDef = CollectionDefBase & {
	kind: 'list';
	media?: string;
};

export type SingletonCollectionDef = CollectionDefBase & {
	kind: 'singleton';
};

export type CollectionDef = ListCollectionDef | SingletonCollectionDef;

export type ContentSchemaRegistry = Record<string, CollectionDef>;

export function defineListCollection(
	def: Omit<ListCollectionDef, 'kind' | 'schema'>,
): ListCollectionDef {
	return { kind: 'list', ...def, schema: def.record.schema };
}

export function defineSingleton(
	def: Omit<SingletonCollectionDef, 'kind' | 'schema'>,
): SingletonCollectionDef {
	return { kind: 'singleton', ...def, schema: def.record.schema };
}

export type { CollectionKind };
