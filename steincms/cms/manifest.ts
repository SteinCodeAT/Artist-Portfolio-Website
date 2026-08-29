import fs from 'node:fs';
import path from 'node:path';

export type SteinCMSManifest = {
	steinCMSVersion: string;
	contentSchemaVersion: number;
};

const cache = new Map<string, SteinCMSManifest>();

export function getSteinCMSManifestPath(projectRoot = process.cwd()): string {
	return path.join(projectRoot, 'steincms', 'manifest.json');
}

export function readSteinCMSManifest(projectRoot = process.cwd()): SteinCMSManifest {
	const manifestPath = getSteinCMSManifestPath(projectRoot);
	const cached = cache.get(manifestPath);
	if (cached) {
		return cached;
	}

	const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SteinCMSManifest;
	if (!raw.steinCMSVersion || typeof raw.contentSchemaVersion !== 'number') {
		throw new Error('Invalid steincms/manifest.json — expected steinCMSVersion and contentSchemaVersion');
	}

	cache.set(manifestPath, raw);
	return raw;
}
