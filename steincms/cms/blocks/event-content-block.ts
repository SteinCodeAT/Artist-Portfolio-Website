import { z } from 'zod';
import { imageBlockSchema, tableBlockSchema, textBlockSchema } from './content-block';

export const eventContentBlockSchema = z.discriminatedUnion('type', [
	textBlockSchema,
	imageBlockSchema,
	tableBlockSchema,
]);

export type EventContentBlockRecord = z.infer<typeof eventContentBlockSchema>;
