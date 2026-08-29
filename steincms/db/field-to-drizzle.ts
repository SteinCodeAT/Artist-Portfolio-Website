import type { FieldKind } from '@steincms/cms/schema';
import { getRecordFields, type RecordDef } from '@steincms/cms/schema';

const JSON_FIELD_KINDS = new Set<FieldKind>([
	'stringList',
	'contentBlockList',
	'mediaUrlList',
	'registrationForm',
	'previewDraft',
	'fieldGroup',
]);

const INTEGER_FIELD_KINDS = new Set<FieldKind>(['number', 'positiveNumber']);

const INDEXED_FIELD_NAMES = new Set(['date', 'category', 'status', 'publishedAt']);

export function camelToSnake(name: string): string {
	return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function singletonContentTypeName(collectionId: string): string {
	return `${collectionId.charAt(0).toUpperCase()}${collectionId.slice(1)}Content`;
}

function jsonTsType(kind: FieldKind): string {
	if (kind === 'stringList' || kind === 'mediaUrlList') {
		return 'string[]';
	}
	if (kind === 'fieldGroup') {
		return 'Record<string, unknown>';
	}
	return 'unknown';
}

function drizzleColumn(fieldName: string, kind: FieldKind): string {
	const sqlName = camelToSnake(fieldName);
	const prop = fieldName;

	if (kind === 'id') {
		return `${prop}: text('${sqlName}').primaryKey()`;
	}

	if (kind === 'slug') {
		return `${prop}: text('${sqlName}').unique()`;
	}

	if (INTEGER_FIELD_KINDS.has(kind)) {
		return `${prop}: integer('${sqlName}')`;
	}

	if (JSON_FIELD_KINDS.has(kind)) {
		const tsType = jsonTsType(kind);
		return `${prop}: text('${sqlName}', { mode: 'json' }).$type<${tsType}>()`;
	}

	return `${prop}: text('${sqlName}')`;
}

function drizzleIndexes(tableName: string, record: RecordDef): string[] {
	const indexes: string[] = [];

	for (const field of getRecordFields(record)) {
		if (!INDEXED_FIELD_NAMES.has(field.name)) {
			continue;
		}
		indexes.push(
			`\t\tindex('${tableName}_${camelToSnake(field.name)}_idx').on(table.${field.name}),`,
		);
	}

	return indexes;
}

export type GeneratedCollectionSchema = {
	collectionId: string;
	tableName: string;
	fileName: string;
	source: string;
};

export function generateListCollectionSchema(collectionId: string, record: RecordDef): GeneratedCollectionSchema {
	const tableName = collectionId;
	const fields = getRecordFields(record);

	const columnLines = fields.map((field) => `\t\t${drizzleColumn(field.name, field.kind)},`);
	const indexLines = drizzleIndexes(tableName, record);

	const indexesBlock =
		indexLines.length > 0
			? `\n\t(table) => [\n${indexLines.join('\n')}\n\t],`
			: '';

	const source = `import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const ${tableName} = sqliteTable(
\t'${tableName}',
\t{
${columnLines.join('\n')}
\t},${indexesBlock}
);
`;

	return {
		collectionId,
		tableName,
		fileName: `${collectionId}.ts`,
		source,
	};
}

export type GeneratedSingletonTypes = {
	typeImports: string[];
	unionMembers: string[];
};

export function generateSingletonTypeNames(collectionIds: string[]): GeneratedSingletonTypes {
	const typeImports: string[] = [];
	const unionMembers: string[] = [];

	for (const id of collectionIds) {
		const typeName = singletonContentTypeName(id);
		typeImports.push(typeName);
		unionMembers.push(typeName);
	}

	unionMembers.push('Record<string, unknown>');

	return { typeImports, unionMembers };
}

export function generateSingletonsSchema(options: GeneratedSingletonTypes): string {
	const importLine =
		options.typeImports.length > 0
			? `import type { ${options.typeImports.join(', ')} } from '../../../content.schema';\n\n`
			: '';

	const dataType =
		options.unionMembers.length > 1
			? options.unionMembers.join(' | ')
			: 'Record<string, unknown>';

	return `${importLine}import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const singletons = sqliteTable('singletons', {
\tkey: text('key').primaryKey(),
\tschemaVersion: integer('schema_version'),
\tdata: text('data', { mode: 'json' }).$type<${dataType}>(),
});
`;
}

export function generateRegistrationsWrapper(eventsCollectionId: string): string {
	return [
		`import { ${eventsCollectionId} } from './${eventsCollectionId}';`,
		"import { createRegistrationsTable } from '@steincms/db/schema/registrations';",
		'',
		`export const registrations = createRegistrationsTable(${eventsCollectionId});`,
		'',
	].join('\n');
}

export function generateSchemaIndexExports(moduleNames: string[]): string {
	const exports = moduleNames.map((name) => `export * from './${name}';`).join('\n');
	return `${exports}\n`;
}

/** @deprecated Use generateSchemaIndexExports */
export function generateCollectionIndexExports(collectionIds: string[]): string {
	return generateSchemaIndexExports(collectionIds);
}
