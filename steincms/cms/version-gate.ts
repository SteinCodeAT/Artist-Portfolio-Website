import path from 'node:path';
import { readSchemaVersionFromFile } from '@steincms/cms/content-envelope';
import type { SteinCMSManifest } from '@steincms/cms/manifest';
import { iterateCollections, type ContentSchemaRegistry } from '@steincms/cms/schema';

export class SteinCMSCodeVersionMismatchError extends Error {
	constructor(
		public readonly manifestVersion: string,
		public readonly expectedVersion: string,
	) {
		super(
			[
				'SteinCMS code version mismatch',
				`  steincms/manifest.json:  ${manifestVersion}`,
				`  site.config expected:  ${expectedVersion}`,
				'',
				'Review steincms/CHANGELOG.md, update site code, then bump cms.expectedSteinCMSVersion in site.config.ts',
			].join('\n'),
		);
		this.name = 'SteinCMSCodeVersionMismatchError';
	}
}

export class ContentVersionMismatchError extends Error {
	constructor(
		public readonly target: number,
		public readonly mismatches: Array<{ id: string; path: string; fileVersion: number | undefined }>,
	) {
		super(
			[
				`Content schema mismatch (target: v${target} from steincms/manifest.json)`,
				...mismatches.map(
					(item) =>
						`  ${item.id.padEnd(12)} ${item.path}  (v${item.fileVersion ?? 'missing'})`,
				),
				'',
				'Run: npm run cms:migrate',
			].join('\n'),
		);
		this.name = 'ContentVersionMismatchError';
	}
}

export function assertSteinCMSCodeVersion(manifest: SteinCMSManifest, expectedSteinCMSVersion: string): void {
	if (manifest.steinCMSVersion !== expectedSteinCMSVersion) {
		throw new SteinCMSCodeVersionMismatchError(manifest.steinCMSVersion, expectedSteinCMSVersion);
	}
}

export function assertContentSchemaVersions(
	manifest: SteinCMSManifest,
	contentSchema: ContentSchemaRegistry,
	projectRoot = process.cwd(),
): void {
	const target = manifest.contentSchemaVersion;
	const mismatches: Array<{ id: string; path: string; fileVersion: number | undefined }> = [];

	// Only collections with a jsonImportPath have a JSON file to version-check —
	// a collection that lives only in the database has nothing to compare here.
	for (const { id, jsonImportPath } of iterateCollections(contentSchema)) {
		if (!jsonImportPath) {
			continue;
		}

		const absolutePath = path.resolve(projectRoot, jsonImportPath);
		const fileVersion = readSchemaVersionFromFile(absolutePath);
		if (fileVersion !== target) {
			mismatches.push({ id, path: jsonImportPath, fileVersion });
		}
	}

	if (mismatches.length > 0) {
		throw new ContentVersionMismatchError(target, mismatches);
	}
}

export function assertCmsVersions(
	manifest: SteinCMSManifest,
	expectedSteinCMSVersion: string,
	contentSchema: ContentSchemaRegistry,
	projectRoot = process.cwd(),
): void {
	assertSteinCMSCodeVersion(manifest, expectedSteinCMSVersion);
	assertContentSchemaVersions(manifest, contentSchema, projectRoot);
}
