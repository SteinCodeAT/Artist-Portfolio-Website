import fs from 'node:fs';
import path from 'node:path';

export type ListContentEnvelope<T> = {
	schemaVersion: number;
	records: T[];
};

export type CollectionKind = 'list' | 'singleton';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readSchemaVersionFromRaw(raw: unknown): number | undefined {
	if (!isRecord(raw)) {
		return undefined;
	}

	const version = raw.schemaVersion;
	return typeof version === 'number' && Number.isInteger(version) ? version : undefined;
}

export function readSchemaVersionFromFile(filePath: string): number | undefined {
	if (!fs.existsSync(filePath)) {
		return undefined;
	}

	try {
		const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
		return readSchemaVersionFromRaw(raw);
	} catch {
		return undefined;
	}
}

export function isBareArray(raw: unknown): raw is unknown[] {
	return Array.isArray(raw);
}

export function parseListRecords<T>(raw: unknown): T[] {
	if (isBareArray(raw)) {
		return raw as T[];
	}

	if (isRecord(raw) && Array.isArray(raw.records)) {
		return raw.records as T[];
	}

	return [];
}

export function wrapListEnvelope<T>(records: T[], schemaVersion: number): ListContentEnvelope<T> {
	return { schemaVersion, records };
}

export function parseSingletonData(raw: unknown): Record<string, unknown> {
	if (!isRecord(raw)) {
		return {};
	}

	const { schemaVersion: _version, ...data } = raw;
	return data;
}

export function wrapSingletonEnvelope(
	data: Record<string, unknown>,
	schemaVersion: number,
): Record<string, unknown> {
	return { schemaVersion, ...data };
}

export function readJsonFile(filePath: string): unknown {
	if (!fs.existsSync(filePath)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
}

export function writeJsonFile(filePath: string, data: unknown): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n', 'utf-8');
}
