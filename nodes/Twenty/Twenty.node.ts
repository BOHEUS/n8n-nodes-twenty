import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { getObjects } from './loadOptions/getObjects';
import { getMappingColumns } from './resourceMapping/getMappingColumns';
import { createMany } from './operations/createMany';
import { buildRecord } from './shared/buildRecord';
import { toNodeError } from './shared/errors';
import { twentyApiRequest, twentyApiRequestAllItems, unwrapRecord } from './shared/transport';

export class Twenty implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twenty',
		name: 'twenty',
		icon: { light: 'file:../../icons/twenty.svg', dark: 'file:../../icons/twenty.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["object"]}}',
		description: 'Read and write records in your Twenty workspace',
		defaults: {
			name: 'Twenty',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'twentyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Object Name or ID',
				name: 'object',
				type: 'options',
				noDataExpression: true,
				typeOptions: { loadOptionsMethod: 'getObjects' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a record',
						description: 'Create a record of the object',
					},
					{
						name: 'Create Many',
						value: 'createMany',
						action: 'Create many records',
						description: 'Create a record for every input item, in batches',
					},
					{
						name: 'Create or Update',
						value: 'upsert',
						action: 'Create or update a record',
						description:
							'Create a new record, or update the current one if it already exists (upsert)',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a record',
						description: 'Delete a record of the object',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a record',
						description: 'Get a record of the object by its ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many records',
						description: 'Get many records of the object',
					},
					{
						name: 'Restore',
						value: 'restore',
						action: 'Restore a record',
						description: 'Restore a deleted record from the trash',
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update a record',
						description: 'Update a record of the object',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				displayOptions: { show: { operation: ['get', 'update', 'delete', 'restore'] } },
				default: '',
				required: true,
				description: 'The ID of the record',
			},
			{
				displayName: 'Record ID',
				name: 'upsertId',
				type: 'string',
				displayOptions: { show: { operation: ['upsert'] } },
				default: '',
				description:
					'Optional. The record to update, or the ID a new record is created with. Leave empty to match on the unique fields only.',
			},
			{
				displayName: 'Delete Permanently',
				name: 'permanently',
				type: 'boolean',
				displayOptions: { show: { operation: ['delete'] } },
				default: false,
				description:
					'Whether to delete the record for good instead of moving it to the trash, where it can be restored',
			},
			{
				displayName: 'Fields',
				name: 'columns',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				displayOptions: { show: { operation: ['create', 'createMany', 'update', 'upsert'] } },
				typeOptions: {
					loadOptionsDependsOn: ['object'],
					resourceMapper: {
						resourceMapperMethod: 'getMappingColumns',
						mode: 'add',
						fieldWords: { singular: 'field', plural: 'fields' },
						addAllFields: false,
						supportAutoMap: true,
					},
				},
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: { show: { operation: ['getAll'] } },
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { operation: ['getAll'], returnAll: [false] } },
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: { show: { operation: ['getAll'] } },
				default: {},
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						default: '',
						placeholder: 'name.firstName[eq]:"Ada"',
						description:
							'Twenty filter expression, e.g. <code>name.firstName[eq]:"Ada"</code> or <code>and(jobTitle[eq]:"CEO",createdAt[gte]:"2026-01-01")</code>',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getObjects,
		},
		resourceMapping: {
			getMappingColumns,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		if (this.getNodeParameter('operation', 0) === 'createMany') {
			return [await createMany.call(this)];
		}

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const object = this.getNodeParameter('object', i) as string;
				let records: IDataObject[];

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
					const { filter } = this.getNodeParameter('options', i) as { filter?: string };

					records = await twentyApiRequestAllItems.call(
						this,
						`/rest/${object}`,
						filter ? { filter } : {},
						limit,
					);
				} else if (operation === 'create' || operation === 'upsert') {
					const record = buildRecord.call(this, i);
					const upsert = operation === 'upsert';
					const id = upsert ? (this.getNodeParameter('upsertId', i) as string) : '';
					if (id) record.id = id;

					records = [
						unwrapRecord(
							await twentyApiRequest.call(
								this,
								'POST',
								`/rest/${object}`,
								upsert ? { upsert: true } : {},
								record,
							),
						),
					];
				} else {
					// Encoding keeps an unexpected expression result inside the URL path.
					const id = encodeURIComponent(this.getNodeParameter('recordId', i) as string);
					const path = `/rest/${object}/${id}`;
					let response: unknown;
					switch (operation) {
						case 'get':
							response = await twentyApiRequest.call(this, 'GET', path);
							break;
						case 'update':
							response = await twentyApiRequest.call(
								this,
								'PATCH',
								path,
								{},
								buildRecord.call(this, i),
							);
							break;
						case 'restore':
							response = await twentyApiRequest.call(this, 'PATCH', `${path}/restore`);
							break;
						default: {
							// Twenty moves deleted records to the trash unless told otherwise.
							const permanently = this.getNodeParameter('permanently', i) as boolean;
							response = await twentyApiRequest.call(
								this,
								'DELETE',
								path,
								permanently ? { soft_delete: false } : {},
							);
						}
					}
					records = [unwrapRecord(response)];
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(records), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw toNodeError(this.getNode(), error, i);
			}
		}

		return [returnData];
	}
}
