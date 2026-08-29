import { z } from 'zod';

export const registrationFieldOptionSchema = z.object({
	id: z.string(),
	label: z.string(),
});

export const registrationFieldSchema = z.object({
	id: z.string(),
	type: z.enum(['single', 'multi', 'number', 'text', 'yesno']),
	label: z.string(),
	required: z.boolean(),
	options: z.array(registrationFieldOptionSchema).optional(),
});

export const registrationFormSchema = z.object({
	enabled: z.boolean(),
	fields: z.array(registrationFieldSchema),
	maxAttendees: z.number().int().min(1).max(9999).optional().default(50),
	maxGuests: z.number().int().min(1).max(50).optional().default(5),
});

export type RegistrationFormRecord = z.infer<typeof registrationFormSchema>;
