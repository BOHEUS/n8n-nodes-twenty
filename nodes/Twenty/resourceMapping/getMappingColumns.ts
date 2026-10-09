import type {
	FieldType,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getObjectsMetadata, type FieldMetadata } from '../shared/metadata';

// Twenty field type -> input type. Types missing here (TS_VECTOR, POSITION, ACTOR, FILES, UUID,
// MORPH_RELATION, ...) are managed by Twenty and are not offered for writing.
const FIELD_TYPES: Record<string, FieldType> = {
	TEXT: 'string',
	NUMBER: 'number',
	NUMERIC: 'number',
	BOOLEAN: 'boolean',
	DATE: 'dateTime',
	DATE_TIME: 'dateTime',
	SELECT: 'options',
	RATING: 'options',
	MULTI_SELECT: 'array',
	ARRAY: 'array',
	// Composite fields (name, emails, phones, links, address, currency, ...) are nested JSON.
	FULL_NAME: 'object',
	EMAILS: 'object',
	PHONES: 'object',
	LINKS: 'object',
	ADDRESS: 'object',
	CURRENCY: 'object',
	RICH_TEXT: 'object',
	RAW_JSON: 'object',
};

// Only creating a record needs every required field; updates and searches send a subset.
const CREATE_OPERATIONS = ['create', 'createMany'];

// Enough values to show the format without stretching the label across the screen.
const MAX_LISTED_VALUES = 10;

function multiSelectLabel({ label, options = [] }: FieldMetadata): string {
	if (options.length === 0) return label;

	const values = options.slice(0, MAX_LISTED_VALUES).map(({ value }) => JSON.stringify(value));
	const more = options.length > MAX_LISTED_VALUES ? ', …' : '';
	return `${label}, any of [${values.join(',')}${more}]`;
}

function toMapperField(field: FieldMetadata, creating: boolean): ResourceMapperField | undefined {
	if (!field.isActive || field.isSystem || field.isUIReadOnly || field.writability !== 'OPEN') {
		return undefined;
	}

	const base = { defaultMatch: false, canBeUsedToMatch: false, display: true };
	// Twenty fills in a default for missing values, so only fields without one are really required.
	const required = creating && !field.isNullable && field.defaultValue == null;

	// A many-to-one relation is written through its join column (e.g. `company` -> `companyId`).
	// The other relation kinds are the inverse side and cannot be written directly.
	if (field.type === 'RELATION') {
		const { relationType, joinColumnName } = field.settings ?? {};
		if (relationType !== 'MANY_TO_ONE' || !joinColumnName) return undefined;
		return {
			...base,
			id: joinColumnName,
			displayName: `${field.label} (ID)`,
			required,
			type: 'string',
		};
	}

	const type = FIELD_TYPES[field.type];
	if (!type) return undefined;

	return {
		...base,
		id: field.name,
		// The field mapper has no multi-select input, so the values to type are listed in the label.
		displayName: field.type === 'MULTI_SELECT' ? multiSelectLabel(field) : field.label,
		required,
		type,
		...(type === 'options' && {
			options: (field.options ?? []).map(({ value, label }) => ({ name: label, value })),
		}),
	};
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const objectName = this.getNodeParameter('object') as string;
	const creating = CREATE_OPERATIONS.includes(this.getNodeParameter('operation') as string);
	const object = (await getObjectsMetadata.call(this)).find(
		({ namePlural }) => namePlural === objectName,
	);

	if (!object) {
		throw new NodeOperationError(this.getNode(), `Object "${objectName}" not found in workspace`);
	}

	return {
		fields: object.fields
			.map((field) => toMapperField(field, creating))
			.filter((field) => field !== undefined),
	};
}
