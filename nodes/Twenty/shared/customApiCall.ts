import {
	NodeOperationError,
	type IDataObject,
	type IHttpRequestMethods,
	type INode,
} from 'n8n-workflow';

interface CustomRequestInput {
	method: IHttpRequestMethods;
	path: string;
	query: string | IDataObject;
	body: string | IDataObject;
}

export function buildCustomRequest(node: INode, itemIndex: number, input: CustomRequestInput) {
	const path = input.path.trim();
	if (!path.startsWith('/') || path.startsWith('//')) {
		throw new NodeOperationError(node, 'The path must start with a single "/", e.g. /rest/people', {
			itemIndex,
		});
	}

	const hasBody = ['PATCH', 'POST', 'PUT'].includes(input.method);
	const body = hasBody ? parseJson(node, itemIndex, 'Body', input.body) : undefined;

	return {
		method: input.method,
		path,
		qs: parseJson(node, itemIndex, 'Query Parameters', input.query) ?? {},
		body,
	};
}

function parseJson(node: INode, itemIndex: number, label: string, value: string | IDataObject) {
	if (typeof value !== 'string') return value;
	if (!value.trim()) return undefined;

	try {
		return JSON.parse(value) as IDataObject;
	} catch {
		throw new NodeOperationError(node, `${label} is not valid JSON`, { itemIndex });
	}
}

export function toCustomResponseRecords(response: unknown): IDataObject[] {
	return (Array.isArray(response) ? response : [response]).map((entry: unknown) => {
		if (entry !== null && typeof entry === 'object') return entry as IDataObject;
		return entry === undefined || entry === null || entry === '' ? {} : { value: entry };
	});
}
