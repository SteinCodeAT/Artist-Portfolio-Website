import { createCms } from '@steincms/cms/create-cms';
import { cmsDatabase } from './db/cms-database';
import { contentSchema } from './content.schema';
import { siteConfig } from './site.config';

export const cms = createCms({ siteConfig, contentSchema, database: cmsDatabase });
