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

/**
 * Validates a custom request. The path is appended to the credential's Base URL, so it must stay
 * a path: anything else could send the API key to another host.
 */
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

// The JSON editor hands over text, expressions can hand over objects.
function parseJson(node: INode, itemIndex: number, label: string, value: string | IDataObject) {
	if (typeof value !== 'string') return value;
	if (!value.trim()) return undefined;

	try {
		return JSON.parse(value) as IDataObject;
	} catch {
		throw new NodeOperationError(node, `${label} is not valid JSON`, { itemIndex });
	}
}
