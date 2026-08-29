import { z } from 'zod';
import type {
	BaseFieldDef,
	BaseFieldOptions,
	FieldDef,
	FieldGroupDef,
	TextFieldDef,
} from './types';

function resolveAdmin(options: BaseFieldOptions): BaseFieldDef['admin'] {
	return {
		visible: options.admin?.visible ?? true,
		editor: options.admin?.editor,
	};
}

function finalizeField<K extends BaseFieldDef['kind']>(
	kind: K,
	zodType: z.ZodTypeAny,
	options: BaseFieldOptions = {},
): BaseFieldDef & { kind: K } {
	return {
		kind,
		name: '',
		label: options.label,
		optional: options.optional,
		group: options.group,
		admin: resolveAdmin(options),
		zod: options.optional ? zodType.optional() : zodType,
	};
}

export type TextFieldOptions = BaseFieldOptions & {
	required?: boolean;
	nullable?: boolean;
	min?: number;
	rows?: number;
};

export type FieldGroupOptions = BaseFieldOptions & {
	fields: Record<string, FieldDef>;
};

export function idField(options: BaseFieldOptions = {}): FieldDef {
	return finalizeField('id', z.string(), options);
}

export function slugField(options: BaseFieldOptions = {}): FieldDef {
	return finalizeField('slug', z.string(), options);
}

export function textField(options: TextFieldOptions = {}): TextFieldDef {
	let schema: z.ZodTypeAny = z.string();
	if (options.min !== undefined) {
		schema = z.string().min(options.min);
	}
	if (options.required) {
		schema = (schema as z.ZodString).min(1);
	}
	if (options.nullable) {
		schema = schema.nullable();
	}
	return {
		...finalizeField('text', schema, options),
		rows: options.rows ?? 1,
	};
}

export function numberField(options: BaseFieldOptions & { nullable?: boolean; int?: boolean } = {}): FieldDef {
	let schema: z.ZodTypeAny = options.int ? z.number().int() : z.number();
	if (options.nullable) {
		schema = schema.nullable();
	}
	return finalizeField('number', schema, options);
}

export function positiveNumberField(options: BaseFieldOptions & { nullable?: boolean, int?: boolean } = {}): FieldDef {
	let schema: z.ZodTypeAny = options.int ? z.number().int().nonnegative() : z.number().nonnegative();
	if (options.nullable) {
		schema = schema.nullable();
	}
	return finalizeField('positiveNumber', schema, options);
}

export function dateField(options: BaseFieldOptions & { nullable?: boolean } = {}): FieldDef {
	let schema: z.ZodTypeAny = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
	if (options.nullable) {
		schema = schema.nullable();
	}
	return finalizeField('date', schema, options);
}

export function enumField<T extends string>(
	values: readonly [T, ...T[]],
	options: BaseFieldOptions = {},
): FieldDef {
	return finalizeField('enum', z.enum(values), options);
}

export function stringListField(
	options: BaseFieldOptions & { minItems?: number; itemMin?: number } = {},
): FieldDef {
	let schema: z.ZodTypeAny = z.array(
		options.itemMin !== undefined ? z.string().min(options.itemMin) : z.string(),
	);
	if (options.minItems !== undefined) {
		schema = (schema as z.ZodArray<z.ZodString>).min(options.minItems);
	}
	return finalizeField('stringList', schema, options);
}

export function mediaUrlField(options: BaseFieldOptions & { nullable?: boolean } = {}): FieldDef {
	let schema: z.ZodTypeAny = z.string();
	if (options.nullable) {
		schema = schema.nullable();
	}
	return finalizeField('mediaUrl', schema, options);
}

export function fieldGroup(options: FieldGroupOptions): FieldGroupDef {
	const nestedFields: FieldDef[] = Object.entries(options.fields).map(([name, field]) => ({
		...field,
		name,
	}));
	const schema = z.object(
		Object.fromEntries(nestedFields.map((field) => [field.name, field.zod])) as z.ZodRawShape,
	);
	return {
		...finalizeField('fieldGroup', schema, options),
		fields: nestedFields,
	};
}

export function isoTimestampField(options: BaseFieldOptions & { nullable?: boolean } = {}): FieldDef {
	let schema: z.ZodTypeAny = z.string();
	if (options.nullable) {
		schema = schema.nullable();
	}
	return finalizeField('text', schema, options);
}
