/**
 * Read-side helpers for an already-built `ContentSchemaRegistry`/`RecordDef`
 * (see `./schema-builders` for the write-side API used in `content.schema.ts`).
 * Used by codegen (`db:sync-schema`), admin nav, and API handlers — never by
 * a project's `content.schema.ts` itself.
 */
import type { CollectionDef, ListCollectionDef, RecordDef, SingletonCollectionDef } from './schema-builders';
import { getRecordFields } from './schema-builders';
import type { FieldDef, FieldKind } from './fields/types';
import { isContentBlockListField } from './fields/types';
import type { AdminEditorProfile, ContentSchemaRegistry } from './schema-builders';
import type { CollectionKind } from '@steincms/cms/content-envelope';

// ---- Iterating / finding collections ---------------------------------------

export type CollectionRef = {
	id: string;
	jsonImportPath?: string;
	kind: CollectionKind;
	def: CollectionDef;
};

export function iterateCollections(schema: ContentSchemaRegistry): CollectionRef[] {
	return Object.entries(schema).map(([id, def]) => ({
		id,
		jsonImportPath: def.jsonImportPath,
		kind: def.kind,
		def,
	}));
}

export function findListCollection(
	schema: ContentSchemaRegistry,
	predicate: (id: string, def: ListCollectionDef) => boolean,
): { id: string; def: ListCollectionDef } | undefined {
	for (const [id, def] of Object.entries(schema)) {
		if (def.kind === 'list' && predicate(id, def)) {
			return { id, def };
		}
	}
	return undefined;
}

export function findEventsCollection(schema: ContentSchemaRegistry) {
	return (
		findListCollection(schema, (id, def) => id === 'events' || def.admin.editor === 'event')
	);
}

export function findPostsCollection(schema: ContentSchemaRegistry) {
	return (
		findListCollection(schema, (id, def) => id === 'posts' || def.admin.editor === 'post-blocks')
	);
}

export function iterateSingletons(
	schema: ContentSchemaRegistry,
): Array<{ id: string; def: SingletonCollectionDef }> {
	return Object.entries(schema)
		.filter((entry): entry is [string, SingletonCollectionDef] => entry[1].kind === 'singleton')
		.map(([id, def]) => ({ id, def }));
}

export function findCollectionByEditor(
	schema: ContentSchemaRegistry,
	editor: AdminEditorProfile,
): CollectionDef | undefined {
	return Object.values(schema).find((def) => def.admin.editor === editor);
}

// ---- Inspecting a record's fields -------------------------------------------

export type EventEditorPanelConfig = {
	showBlocksPanel: boolean;
	showGalleryPanel: boolean;
	showRegistrationPanel: boolean;
	blocksLabel?: string;
	galleryLabel?: string;
	registrationLabel?: string;
};

export function eventEditorPanelsFromRecord(record: RecordDef): EventEditorPanelConfig {
	const blocksField = getContentBlockFields(record)[0];
	const galleryField = fieldByName(record, 'gallery');
	const registrationField = fieldByName(record, 'registrationForm');

	return {
		showBlocksPanel: Boolean(blocksField),
		showGalleryPanel: Boolean(galleryField),
		showRegistrationPanel: hasFieldKind(record, 'registrationForm'),
		blocksLabel: blocksField?.label,
		galleryLabel: galleryField?.label,
		registrationLabel: registrationField?.label,
	};
}

export function fieldsOfKind(record: RecordDef, kind: FieldKind): FieldDef[] {
	return getRecordFields(record).filter((field) => field.kind === kind);
}

export function fieldByName(record: RecordDef, name: string): FieldDef | undefined {
	return record.fields[name];
}

export function hasFieldKind(record: RecordDef, kind: FieldKind): boolean {
	return fieldsOfKind(record, kind).length > 0;
}

export function getContentBlockFields(record: RecordDef) {
	return getRecordFields(record).filter(isContentBlockListField);
}

export function getCollectionRecord(def: CollectionDef): RecordDef | undefined {
	return 'record' in def ? def.record : undefined;
}
