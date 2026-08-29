import { z } from 'zod';
import {
	contentBlockSchema,
	galleryBlockSchema,
	imageBlockSchema,
	tableBlockSchema,
	textBlockSchema,
} from '@steincms/cms/blocks/content-block';
import type { ContentBlockType } from './types';

const BLOCK_SCHEMA_BY_TYPE = {
	text: textBlockSchema,
	image: imageBlockSchema,
	gallery: galleryBlockSchema,
	table: tableBlockSchema,
} as const;

const FULL_POST_TYPES: ContentBlockType[] = ['text', 'image', 'gallery', 'table'];
const EVENT_ARTICLE_TYPES: ContentBlockType[] = ['text', 'image', 'table'];

function sameTypes(a: ContentBlockType[], b: ContentBlockType[]): boolean {
	if (a.length !== b.length) return false;
	const setA = new Set(a);
	return b.every((type) => setA.has(type));
}

export function blockArraySchema(types: ContentBlockType[]): z.ZodTypeAny {
	if (types.length === 0) {
		throw new Error('contentBlockList requires at least one block type');
	}

	if (sameTypes(types, FULL_POST_TYPES)) {
		return z.array(contentBlockSchema);
	}

	if (sameTypes(types, EVENT_ARTICLE_TYPES)) {
		return z.array(
			z.discriminatedUnion('type', [textBlockSchema, imageBlockSchema, tableBlockSchema]),
		);
	}

	const schemas = types.map((type) => BLOCK_SCHEMA_BY_TYPE[type]);
	if (schemas.length === 1) {
		return z.array(schemas[0]);
	}

	return z.array(
		z.discriminatedUnion('type', schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]),
	);
}
