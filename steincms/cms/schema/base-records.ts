/** Legacy base Zod shapes (id/slug + a few common fields) kept for a couple of external type re-exports (`EventBase`, `PostBase`). Not part of the generated DB pipeline. */
import { z } from 'zod';

export const coreListRecordSchema = z.object({
	id: z.string(),
	slug: z.string(),
});

export const eventBaseSchema = coreListRecordSchema.extend({
	title: z.string().min(1),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.nullable(),
	location: z.string().nullable().optional(),
});

export const postBaseSchema = coreListRecordSchema.extend({
	title: z.string().min(1),
	date: z.string().nullable(),
});

export type EventBase = z.infer<typeof eventBaseSchema>;
export type PostBase = z.infer<typeof postBaseSchema>;
