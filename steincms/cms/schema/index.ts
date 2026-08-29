/**
 * Public entry point: `import { ... } from '@steincms/cms/schema'`.
 * Everything below is re-exported from a small set of files in this folder —
 * see schema-builders.ts (define your content) and schema-query.ts (read an
 * already-defined schema) for what lives where and why.
 */
export {
	coreListRecordSchema,
	eventBaseSchema,
	postBaseSchema,
	type EventBase,
	type PostBase,
} from './base-records';
export {
	defineListCollection,
	defineRecord,
	defineSingleton,
	getRecordFields,
	type AdminEditorProfile,
	type CollectionAdminConfig,
	type CollectionDef,
	type ContentSchemaRegistry,
	type ListCollectionDef,
	type RecordDef,
	type SingletonCollectionDef,
} from './schema-builders';
export {
	contentBlockList,
	dateField,
	enumField,
	fieldGroup,
	idField,
	isoTimestampField,
	mediaUrlField,
	mediaUrlList,
	numberField,
	positiveNumberField,
	previewDraftField,
	registrationFormField,
	slugField,
	stringListField,
	textField,
	type ContentBlockType,
	type FieldDef,
	type FieldGroupDef,
	type FieldKind,
	type TextFieldDef,
	isContentBlockListField,
	isFieldGroup,
	isTextField,
	textFieldRows,
} from './fields';
export {
	eventEditorPanelsFromRecord,
	fieldByName,
	fieldsOfKind,
	findCollectionByEditor,
	findEventsCollection,
	findListCollection,
	findPostsCollection,
	getCollectionRecord,
	getContentBlockFields,
	hasFieldKind,
	iterateCollections,
	iterateSingletons,
	type CollectionRef,
	type EventEditorPanelConfig,
} from './schema-query';
