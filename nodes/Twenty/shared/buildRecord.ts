import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type ResourceMapperValue,
} from 'n8n-workflow';

const JSON_TYPES = ['object', 'array'];

/**
 * Builds the request body for create/update from the field mapper: either the values
 * set by hand, or the incoming item's fields that exist in the schema (auto-map).
 */
export function buildRecord(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const mapper = this.getNodeParameter('columns', itemIndex) as ResourceMapperValue;
	const schema = mapper.schema.filter(({ removed }) => !removed);

	const values: IDataObject =
		mapper.mappingMode === 'autoMapInputData'
			? Object.fromEntries(
					Object.entries(this.getInputData()[itemIndex].json).filter(([id]) =>
						schema.some((field) => field.id === id),
					),
				)
			: (mapper.value ?? {});

	const record: IDataObject = {};
	for (const [id, value] of Object.entries(values)) {
		if (value === undefined) continue;

		const field = schema.find((candidate) => candidate.id === id);
		record[id] = parseJsonField(this, itemIndex, id, value, field?.type);
	}
	return record;
}

// Expressions and the editor hand over JSON-typed fields as text.
function parseJsonField(
	context: IExecuteFunctions,
	itemIndex: number,
	id: string,
	value: unknown,
	type?: string,
) {
	if (typeof value !== 'string' || !type || !JSON_TYPES.includes(type)) return value;

	try {
		return JSON.parse(value);
	} catch {
		throw new NodeOperationError(context.getNode(), `Field "${id}" is not valid JSON`, {
			itemIndex,
		});
	}
}
