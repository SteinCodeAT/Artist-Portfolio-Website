/**
 * Field-kind catalog: one function per field you can use inside `defineRecord({ fields: {...} })`
 * (`textField`, `numberField`, `mediaUrlList`, ...). Each wraps a Zod validator plus
 * metadata (label, admin UI hints) — see `types.ts` for the shared `FieldDef` shape.
 */
export type {
	ContentBlockType,
	FieldAdminConfig,
	FieldDef,
	FieldGroupDef,
	FieldKind,
	TextFieldDef,
} from './types';
export { isContentBlockListField, isFieldGroup, isTextField, textFieldRows } from './types';
export {
	contentBlockList,
	mediaUrlList,
	previewDraftField,
	registrationFormField,
} from './structured';
export {
	dateField,
	enumField,
	fieldGroup,
	idField,
	isoTimestampField,
	mediaUrlField,
	numberField,
	positiveNumberField,
	slugField,
	stringListField,
	textField,
} from './scalars';
