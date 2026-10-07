import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type JsonObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { getObjects } from './loadOptions/getObjects';
import { twentyApiRequestAllItems } from './shared/transport';

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
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many records',
						description: 'Get many records of the object',
					},
				],
				default: 'getAll',
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
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const object = this.getNodeParameter('object', i) as string;
				const returnAll = this.getNodeParameter('returnAll', i) as boolean;
				const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
				const { filter } = this.getNodeParameter('options', i) as { filter?: string };

				const qs: IDataObject = filter ? { filter } : {};
				const records = await twentyApiRequestAllItems.call(this, `/rest/${object}`, qs, limit);

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
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
