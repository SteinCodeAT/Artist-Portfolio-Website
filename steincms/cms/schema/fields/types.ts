import type { z } from 'zod';

export type ContentBlockType = 'text' | 'image' | 'gallery' | 'table';

export type FieldKind =
	| 'id'
	| 'slug'
	| 'text'
	| 'number'
	| 'positiveNumber'
	| 'date'
	| 'enum'
	| 'stringList'
	| 'contentBlockList'
	| 'mediaUrlList'
	| 'mediaUrl'
	| 'registrationForm'
	| 'previewDraft'
	| 'fieldGroup';

export type FieldAdminConfig = {
	visible?: boolean;
	editor?: string;
};

export type BaseFieldOptions = {
	label?: string;
	optional?: boolean;
	group?: string;
	admin?: FieldAdminConfig;
};

export type BaseFieldDef = BaseFieldOptions & {
	kind: FieldKind;
	name: string;
	admin: Required<Pick<FieldAdminConfig, 'visible'>> & Pick<FieldAdminConfig, 'editor'>;
	zod: z.ZodTypeAny;
};

export type TextFieldDef = BaseFieldDef & {
	kind: 'text';
	rows: number;
};

export type FieldGroupDef = BaseFieldDef & {
	kind: 'fieldGroup';
	fields: FieldDef[];
};

export type ContentBlockListFieldDef = BaseFieldDef & {
	kind: 'contentBlockList';
	blockTypes: ContentBlockType[];
};

export type FieldDef = BaseFieldDef | ContentBlockListFieldDef | TextFieldDef | FieldGroupDef;

export function isContentBlockListField(field: FieldDef): field is ContentBlockListFieldDef {
	return field.kind === 'contentBlockList';
}

export function isFieldGroup(field: FieldDef): field is FieldGroupDef {
	return field.kind === 'fieldGroup' && Array.isArray((field as FieldGroupDef).fields);
}

export function isTextField(field: FieldDef): field is TextFieldDef {
	return field.kind === 'text' && typeof (field as TextFieldDef).rows === 'number';
}

export function textFieldRows(field: FieldDef): number {
	return isTextField(field) ? field.rows : 1;
}
