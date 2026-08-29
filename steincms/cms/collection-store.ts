/**
 * JSON-file schema-version migrations for the pre-DB era. Used only by the
 * JSON-import tooling (npm run cms:migrate) — not part of the live app, which
 * reads/writes SQLite. See steincms/DATABASE.md, "Migrating an existing
 * JSON-based site onto the database".
 */
import path from 'node:path';
import {
	isBareArray,
	parseListRecords,
	parseSingletonData,
	readJsonFile,
	wrapListEnvelope,
	wrapSingletonEnvelope,
	writeJsonFile,
	type CollectionKind,
} from '@steincms/cms/content-envelope';
import { eventBodyToBlocks } from '@steincms/cms/events/event-body-blocks';

export type MigrationContext = {
	filePath: string;
	kind: CollectionKind;
	fromVersion: number;
	toVersion: number;
};

export type ContentMigration = {
	fromVersion: number;
	toVersion: number;
	migrate: (raw: unknown, ctx: MigrationContext) => unknown;
};

export const contentMigrations: ContentMigration[] = [
	{
		fromVersion: 0,
		toVersion: 1,
		migrate(raw, ctx) {
			if (ctx.kind === 'list') {
				const records = isBareArray(raw) ? raw : parseListRecords(raw);
				return wrapListEnvelope(records, 1);
			}

			const data = isBareArray(raw) ? {} : parseSingletonData(raw);
			return wrapSingletonEnvelope(data, 1);
		},
	},
	{
		fromVersion: 1,
		toVersion: 2,
		migrate(raw, ctx) {
			if (ctx.kind === 'list' && ctx.filePath.includes('event-data')) {
				const records = parseListRecords<Record<string, unknown>>(raw);
				const migrated = records.map((record) => {
					const hasBlocks = Array.isArray(record.blocks) && record.blocks.length > 0;
					const legacyBody = Array.isArray(record.body) ? (record.body as string[]) : [];
					let blocks = record.blocks;
					if (!hasBlocks && legacyBody.length > 0) {
						blocks = eventBodyToBlocks(legacyBody);
					}
					const { body: _body, ...rest } = record;
					return {
						...rest,
						blocks: Array.isArray(blocks) ? blocks : [],
					};
				});
				return wrapListEnvelope(migrated, 2);
			}

			if (ctx.kind === 'list') {
				const records = parseListRecords(raw);
				return wrapListEnvelope(records, 2);
			}

			const data = parseSingletonData(raw);
			return wrapSingletonEnvelope(data, 2);
		},
	},
];

export function applyMigrations(
	raw: unknown,
	kind: CollectionKind,
	targetVersion: number,
	filePath: string,
): unknown {
	let current = raw;
	let version = 0;

	if (!isBareArray(current) && current !== null && typeof current === 'object') {
		const maybeVersion = (current as { schemaVersion?: unknown }).schemaVersion;
		if (typeof maybeVersion === 'number') {
			version = maybeVersion;
			if (version >= targetVersion) {
				return current;
			}
		}
	} else if (isBareArray(current)) {
		version = 0;
	} else if (current === null) {
		version = 0;
		current = kind === 'list' ? [] : {};
	}

	while (version < targetVersion) {
		const step = contentMigrations.find((m) => m.fromVersion === version);
		if (!step) {
			throw new Error(`No migration from content schema v${version} to v${targetVersion} for ${filePath}`);
		}
		current = step.migrate(current, {
			filePath,
			kind,
			fromVersion: step.fromVersion,
			toVersion: step.toVersion,
		});
		version = step.toVersion;
	}

	return current;
}

export function migrateContentFile(
	filePath: string,
	kind: CollectionKind,
	targetVersion: number,
	dryRun = false,
): { changed: boolean; fromVersion: number | undefined; toVersion: number } {
	const absolutePath = path.resolve(filePath);
	const raw = readJsonFile(absolutePath);
	const fromVersion =
		raw === null || isBareArray(raw) ? undefined : (raw as { schemaVersion?: number }).schemaVersion;
	const migrated = applyMigrations(raw ?? (kind === 'list' ? [] : {}), kind, targetVersion, absolutePath);

	if (!dryRun) {
		writeJsonFile(absolutePath, migrated);
	}

	const changed = fromVersion !== targetVersion || raw === null || isBareArray(raw);
	return { changed, fromVersion, toVersion: targetVersion };
}
