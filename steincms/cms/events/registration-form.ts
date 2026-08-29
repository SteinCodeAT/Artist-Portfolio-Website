import { z } from 'zod';

export const MAX_REGISTRATION_FIELDS = 8;
export const MAX_FIELD_OPTIONS = 10;
export const MAX_TEXT_ANSWER = 200;
export const MAX_NUMBER_ANSWER = 10;
export const DEFAULT_MAX_ATTENDEES = 50;
export const DEFAULT_MAX_GUESTS = 5;
export const MAX_MAX_ATTENDEES = 9999;
export const MAX_MAX_GUESTS = 50;

export type RegistrationFieldType = 'single' | 'multi' | 'number' | 'text' | 'yesno';

export type RegistrationFieldOption = {
	id: string;
	label: string;
};

export const YES_NO_OPTIONS: RegistrationFieldOption[] = [
	{ id: 'yes', label: 'Ja' },
	{ id: 'no', label: 'Nein' },
];

export type RegistrationField = {
	id: string;
	type: RegistrationFieldType;
	label: string;
	required: boolean;
	options?: RegistrationFieldOption[];
};

export type EventRegistrationForm = {
	enabled: boolean;
	fields: RegistrationField[];
	maxAttendees: number;
	maxGuests: number;
};

export type RegistrationAnswerValue = string | string[] | number;

export const EMPTY_REGISTRATION_FORM: EventRegistrationForm = {
	enabled: false,
	fields: [],
	maxAttendees: DEFAULT_MAX_ATTENDEES,
	maxGuests: DEFAULT_MAX_GUESTS,
};

const FIELD_TYPES = new Set<RegistrationFieldType>(['single', 'multi', 'number', 'text', 'yesno']);

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function parseOptions(raw: unknown): RegistrationFieldOption[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const options: RegistrationFieldOption[] = [];
	for (const item of raw.slice(0, MAX_FIELD_OPTIONS)) {
		const row = asRecord(item);
		if (!row) continue;
		const id = String(row.id ?? '').trim();
		const label = String(row.label ?? '').trim();
		if (!id || !label) continue;
		options.push({ id, label });
	}
	return options;
}

export function parseRegistrationForm(raw: unknown): EventRegistrationForm {
	const body = asRecord(raw);
	if (!body) {
		return { ...EMPTY_REGISTRATION_FORM };
	}

	const fields: RegistrationField[] = [];
	const list = Array.isArray(body.fields) ? body.fields : [];

	for (const item of list.slice(0, MAX_REGISTRATION_FIELDS)) {
		const row = asRecord(item);
		if (!row) continue;

		const id = String(row.id ?? '').trim();
		const type = String(row.type ?? '').trim() as RegistrationFieldType;
		const label = String(row.label ?? '').trim();
		if (!id || !label || !FIELD_TYPES.has(type)) continue;

		const field: RegistrationField = {
			id,
			type,
			label: label.slice(0, 80),
			required: Boolean(row.required),
		};

		if (type === 'yesno') {
			field.options = YES_NO_OPTIONS;
			fields.push(field);
			continue;
		}

		if (type === 'single' || type === 'multi') {
			const options = parseOptions(row.options);
			if (options.length === 0) continue;
			field.options = options;
		}

		fields.push(field);
	}

	const enabled =
		typeof body.enabled === 'boolean'
			? body.enabled
			: fields.length > 0 || Boolean(body.askKids);

	const maxAttendees = parseBoundedInt(
		body.maxAttendees,
		DEFAULT_MAX_ATTENDEES,
		1,
		MAX_MAX_ATTENDEES,
	);
	const maxGuests = Math.min(
		maxAttendees,
		parseBoundedInt(body.maxGuests, DEFAULT_MAX_GUESTS, 1, MAX_MAX_GUESTS),
	);

	return {
		enabled,
		fields,
		maxAttendees,
		maxGuests,
	};
}

function parseBoundedInt(
	raw: unknown,
	fallback: number,
	min: number,
	max: number,
): number {
	const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
	if (!Number.isInteger(value) || value < min || value > max) {
		return fallback;
	}
	return value;
}

export function isRegistrationEnabled(form: EventRegistrationForm | undefined | null): boolean {
	return Boolean(form?.enabled);
}

export function remainingAttendeeSpots(form: EventRegistrationForm, guestCount: number): number {
	return Math.max(0, form.maxAttendees - guestCount);
}

const yesNoSchema = z.enum(['yes', 'no']);

function answerFieldSchema(field: RegistrationField): z.ZodTypeAny {
	if (field.type === 'yesno') {
		return field.required ? yesNoSchema : yesNoSchema.optional();
	}
	if (field.type === 'single') {
		const ids = (field.options ?? []).map((option) => option.id);
		if (ids.length === 0) return z.never().optional();
		const choice = z.enum(ids as [string, ...string[]]);
		return field.required ? choice : choice.optional();
	}
	if (field.type === 'multi') {
		const ids = (field.options ?? []).map((option) => option.id);
		if (ids.length === 0) return z.never().optional();
		const list = z.array(z.enum(ids as [string, ...string[]])).max(MAX_FIELD_OPTIONS);
		return field.required ? list.min(1) : list.optional();
	}
	if (field.type === 'number') {
		const number = z.number().int().min(0).max(MAX_NUMBER_ANSWER);
		return field.required ? number : number.optional();
	}
	const text = z.string().trim().min(1).max(MAX_TEXT_ANSWER);
	return field.required ? text : text.optional();
}

export function registrationAllowedTopLevelKeys(baitName: string): Set<string> {
	return new Set([
		'eventId',
		'name',
		'email',
		'guests',
		'answers',
		'_sibop',
		baitName,
		'cf-turnstile-response',
	]);
}

export function hasExtraTopLevelKeys(body: Record<string, unknown>, baitName: string): boolean {
	const allowed = registrationAllowedTopLevelKeys(baitName);
	return Object.keys(body).some((key) => !allowed.has(key));
}

export function registrationSubmitSchema(form: EventRegistrationForm, maxGuests: number) {
	const answerShape: Record<string, z.ZodTypeAny> = {};
	for (const field of form.fields) {
		answerShape[field.id] = answerFieldSchema(field);
	}

	return z
		.object({
			eventId: z.string().trim().min(1),
			name: z.string().trim().min(1).max(120),
			email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
			guests: z.coerce.number().int().min(1).max(maxGuests),
			answers: z.object(answerShape).strict().default({}),
			_sibop: z.string().min(1),
		})
		.strict();
}

export type RegistrationSubmitPayload = z.infer<ReturnType<typeof registrationSubmitSchema>>;

/** @deprecated Use isRegistrationEnabled */
export function hasCustomRegistration(form: EventRegistrationForm | undefined | null): boolean {
	return isRegistrationEnabled(form);
}

function optionIds(field: RegistrationField): Set<string> {
	return new Set((field.options ?? []).map((option) => option.id));
}

export function parseRegistrationAnswers(
	form: EventRegistrationForm,
	raw: unknown,
): Record<string, RegistrationAnswerValue> {
	const incoming = asRecord(raw) ?? {};
	const answers: Record<string, RegistrationAnswerValue> = {};
	const known = new Set(form.fields.map((field) => field.id));

	for (const key of Object.keys(incoming)) {
		if (!known.has(key)) {
			throw new Error('Ungültige Formularangabe.');
		}
	}

	for (const field of form.fields) {
		const value = incoming[field.id];

		if (field.type === 'yesno') {
			const chosen = String(value ?? '').trim();
			if (!chosen) {
				if (field.required) throw new Error(`Bitte „${field.label}“ beantworten.`);
				continue;
			}
			if (chosen !== 'yes' && chosen !== 'no') {
				throw new Error(`Ungültige Antwort bei „${field.label}“.`);
			}
			answers[field.id] = chosen;
			continue;
		}

		if (field.type === 'single') {
			const chosen = String(value ?? '').trim();
			if (!chosen) {
				if (field.required) throw new Error(`Bitte „${field.label}“ auswählen.`);
				continue;
			}
			if (!optionIds(field).has(chosen)) {
				throw new Error(`Ungültige Auswahl bei „${field.label}“.`);
			}
			answers[field.id] = chosen;
			continue;
		}

		if (field.type === 'multi') {
			const list = Array.isArray(value)
				? value.map((item) => String(item).trim()).filter(Boolean)
				: typeof value === 'string' && value
					? [value]
					: [];
			if (list.length === 0) {
				if (field.required) throw new Error(`Bitte mindestens eine Option bei „${field.label}“ wählen.`);
				continue;
			}
			const allowed = optionIds(field);
			if (list.some((id) => !allowed.has(id))) {
				throw new Error(`Ungültige Auswahl bei „${field.label}“.`);
			}
			answers[field.id] = list;
			continue;
		}

		if (field.type === 'number') {
			if (value === undefined || value === null || value === '') {
				if (field.required) throw new Error(`Bitte „${field.label}“ angeben.`);
				continue;
			}
			const number = Number.parseInt(String(value), 10);
			if (!Number.isInteger(number) || number < 0 || number > MAX_NUMBER_ANSWER) {
				throw new Error(`${field.label}: 0 bis ${MAX_NUMBER_ANSWER}.`);
			}
			answers[field.id] = number;
			continue;
		}

		const text = String(value ?? '').trim();
		if (!text) {
			if (field.required) throw new Error(`Bitte „${field.label}“ angeben.`);
			continue;
		}
		if (text.length > MAX_TEXT_ANSWER) {
			throw new Error(`${field.label}: höchstens ${MAX_TEXT_ANSWER} Zeichen.`);
		}
		answers[field.id] = text;
	}

	return answers;
}

export function labelsForAnswer(
	field: RegistrationField,
	value: RegistrationAnswerValue | undefined,
): string[] {
	if (value === undefined) return [];

	if (field.type === 'yesno' && typeof value === 'string') {
		const option = YES_NO_OPTIONS.find((item) => item.id === value);
		return option ? [option.label] : [];
	}

	if (field.type === 'single') {
		const option = field.options?.find((item) => item.id === value);
		return option ? [option.label] : [];
	}

	if (field.type === 'multi' && Array.isArray(value)) {
		const byId = new Map((field.options ?? []).map((item) => [item.id, item.label]));
		return value.map((id) => byId.get(id)).filter((label): label is string => Boolean(label));
	}

	if (field.type === 'number' && typeof value === 'number') {
		return [String(value)];
	}

	if (field.type === 'text' && typeof value === 'string') {
		return [value];
	}

	return [];
}

export function answerPairsForGuest(
	form: EventRegistrationForm,
	answers?: Record<string, RegistrationAnswerValue>,
): Array<{ question: string; answer: string }> {
	return form.fields.flatMap((field) => {
		const labels = labelsForAnswer(field, answers?.[field.id]);
		if (labels.length === 0) return [];
		return [{ question: field.label, answer: labels.join(', ') }];
	});
}

export type RegistrationQuestionSummary = {
	question: string;
	type: RegistrationFieldType;
	options?: Array<{ label: string; count: number }>;
	sum?: number;
	answered?: number;
};

export function summarizeRegistrationAnswers(
	form: EventRegistrationForm,
	rows: Array<{ answers?: Record<string, RegistrationAnswerValue> }>,
): RegistrationQuestionSummary[] {
	const total = rows.length;
	const questions: RegistrationQuestionSummary[] = [];

	for (const field of form.fields) {
		if (field.type === 'single' || field.type === 'multi' || field.type === 'yesno') {
			const options = field.type === 'yesno' ? YES_NO_OPTIONS : (field.options ?? []);
			questions.push({
				question: field.label,
				type: field.type,
				options: options.map((option) => ({
					label: option.label,
					count: rows.reduce((sum, row) => {
						const value = row.answers?.[field.id];
						if ((field.type === 'single' || field.type === 'yesno') && value === option.id) {
							return sum + 1;
						}
						if (field.type === 'multi' && Array.isArray(value) && value.includes(option.id)) {
							return sum + 1;
						}
						return sum;
					}, 0),
				})),
			});
			continue;
		}

		if (field.type === 'number') {
			const sum = rows.reduce((totalSum, row) => {
				const value = row.answers?.[field.id];
				return totalSum + (typeof value === 'number' ? value : 0);
			}, 0);
			questions.push({ question: field.label, type: field.type, sum });
			continue;
		}

		const answered = rows.reduce((count, row) => {
			const labels = labelsForAnswer(field, row.answers?.[field.id]);
			return count + (labels.length > 0 ? 1 : 0);
		}, 0);
		if (total > 0) {
			questions.push({ question: field.label, type: field.type, answered });
		}
	}

	return questions;
}

