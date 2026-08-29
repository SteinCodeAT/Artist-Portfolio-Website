import { z } from 'zod';
import { eventContentBlockSchema } from '@steincms/cms/blocks/event-content-block';
import { registrationFormSchema } from './registration-form-schema';

export const eventPreviewDraftSchema = z.object({
	title: z.string(),
	excerpt: z.string(),
	cover: z.string().nullable(),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.nullable(),
	category: z.string(),
	location: z.string().nullable().optional(),
	blocks: z.array(eventContentBlockSchema),
	gallery: z.array(z.string()),
	registrationForm: registrationFormSchema.optional(),
	updatedAt: z.string(),
});

export type EventPreviewDraftRecord = z.infer<typeof eventPreviewDraftSchema>;
