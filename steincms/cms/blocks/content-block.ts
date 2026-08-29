import { z } from 'zod';

export const textBlockSchema = z.object({
	id: z.string(),
	type: z.literal('text'),
	html: z.string(),
});

export const imageBlockSchema = z.object({
	id: z.string(),
	type: z.literal('image'),
	url: z.string(),
	alt: z.string(),
	caption: z.string().optional(),
});

export const galleryImageSchema = z.object({
	id: z.string(),
	url: z.string(),
	thumbUrl: z.string(),
	alt: z.string().optional(),
});

export const galleryBlockSchema = z.object({
	id: z.string(),
	type: z.literal('gallery'),
	images: z.array(galleryImageSchema),
});

export const tableBlockSchema = z.object({
	id: z.string(),
	type: z.literal('table'),
	hasHeaderRow: z.boolean(),
	rows: z.array(z.array(z.string())),
});

export const contentBlockSchema = z.discriminatedUnion('type', [
	textBlockSchema,
	imageBlockSchema,
	galleryBlockSchema,
	tableBlockSchema,
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type GalleryBlock = z.infer<typeof galleryBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
