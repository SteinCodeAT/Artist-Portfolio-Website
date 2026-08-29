import { z } from 'zod';
import { eventPreviewDraftSchema } from '@steincms/cms/events/event-preview-draft';
import { registrationFormSchema } from '@steincms/cms/events/registration-form-schema';
import { blockArraySchema } from './block-union';
import type { BaseFieldOptions, ContentBlockListFieldDef, FieldDef } from './types';

function resolveAdmin(options: BaseFieldOptions) {
	return {
		visible: options.admin?.visible ?? true,
		editor: options.admin?.editor,
	};
}

export type ContentBlockListOptions = BaseFieldOptions & {
	types: Array<'text' | 'image' | 'gallery' | 'table'>;
};

export function contentBlockList(options: ContentBlockListOptions): ContentBlockListFieldDef {
	const zodType = blockArraySchema(options.types);
	return {
		kind: 'contentBlockList',
		name: '',
		label: options.label,
		optional: options.optional,
		group: options.group,
		blockTypes: options.types,
		admin: resolveAdmin(options),
		zod: options.optional ? zodType.optional() : zodType,
	};
}

export function mediaUrlList(options: BaseFieldOptions = {}): FieldDef {
	return {
		kind: 'mediaUrlList',
		name: '',
		label: options.label,
		optional: options.optional,
		group: options.group,
		admin: resolveAdmin(options),
		zod: z.array(z.string()),
	};
}

export function registrationFormField(options: BaseFieldOptions = {}): FieldDef {
	return {
		kind: 'registrationForm',
		name: '',
		label: options.label,
		optional: options.optional ?? true,
		group: options.group,
		admin: resolveAdmin(options),
		zod: options.optional === false ? registrationFormSchema : registrationFormSchema.optional(),
	};
}

export function previewDraftField(options: BaseFieldOptions = {}): FieldDef {
	return {
		kind: 'previewDraft',
		name: '',
		label: options.label,
		optional: options.optional ?? true,
		group: options.group,
		admin: {
			visible: options.admin?.visible ?? false,
			editor: options.admin?.editor,
		},
		zod: eventPreviewDraftSchema.nullable().optional(),
	};
}
