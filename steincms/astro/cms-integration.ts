import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { readSteinCMSManifest } from '@steincms/cms/manifest';
import { assertCmsVersions } from '@steincms/cms/version-gate';
import { listCmsApiRoutes, type CmsSiteConfig } from '@steincms/cms/cms-config';
import type { ContentSchemaRegistry } from '@steincms/cms/schema';

export type CmsIntegrationOptions = {
	/** Site module that exports `{ cms }` (e.g. `./src/cms.ts`). */
	cmsModule: string;
	siteConfig: CmsSiteConfig;
	contentSchema: ContentSchemaRegistry;
};

function routeEntrypoint(fileName: string): string {
	return fileURLToPath(new URL(`../api/routes/${fileName}`, import.meta.url));
}

export function cmsIntegration(options: CmsIntegrationOptions): AstroIntegration {
	return {
		name: 'steincms',
		hooks: {
			'astro:config:setup': ({ config, injectRoute, updateConfig }) => {
				const projectRoot = fileURLToPath(config.root);
				const manifest = readSteinCMSManifest(projectRoot);
				assertCmsVersions(
					manifest,
					options.siteConfig.cms.expectedSteinCMSVersion,
					options.contentSchema,
					projectRoot,
				);

				const cmsModulePath = path.resolve(projectRoot, options.cmsModule);
				updateConfig({
					vite: {
						resolve: {
							alias: {
								'virtual:steincms': cmsModulePath,
							},
						},
					},
				});

				for (const route of listCmsApiRoutes(options.siteConfig, options.contentSchema)) {
					injectRoute({
						pattern: route.pattern,
						entrypoint: routeEntrypoint(route.fileName),
						prerender: false,
					});
				}
			},
		},
	};
}
