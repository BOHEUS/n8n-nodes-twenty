import {
	NodeApiError,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type JsonObject,
} from 'n8n-workflow';

type TwentyContext = IExecuteFunctions | ILoadOptionsFunctions;

interface TwentyListResponse {
	data: Record<string, IDataObject[]>;
	pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

// Twenty serves up to 60 records per page.
const PAGE_SIZE = 60;

export async function twentyApiRequest<T = IDataObject>(
	this: TwentyContext,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
	body?: IDataObject | IDataObject[],
): Promise<T> {
	const { baseUrl } = await this.getCredentials('twentyApi');

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'twentyApi', {
			method,
			url: `${String(baseUrl).replace(/\/$/, '')}${path}`,
			qs,
			body,
			json: true,
		})) as T;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: getTwentyErrorMessage(error),
		});
	}
}

/**
 * Twenty explains failures in the response body, e.g. `{"messages": ["Object person doesn't
 * have any \"x\" field."]}` or a missing field permission. n8n's generic wording hides that.
 */
function getTwentyErrorMessage(error: unknown): string | undefined {
	const { response, cause } = error as {
		response?: { body?: unknown; data?: unknown };
		cause?: { response?: { body?: unknown; data?: unknown } };
	};
	const failed = response ?? cause?.response;
	const body = failed?.body ?? failed?.data;
	const messages = (body as { messages?: unknown } | undefined)?.messages;

	return Array.isArray(messages) && messages.length > 0 ? messages.join('; ') : undefined;
}

/**
 * Follows Twenty's cursor pagination on a list endpoint. The records sit under
 * a single key in `data` that is named after the object (`people`, `objects`, ...).
 */
export async function twentyApiRequestAllItems(
	this: TwentyContext,
	path: string,
	qs: IDataObject = {},
	limit = Infinity,
): Promise<IDataObject[]> {
	const items: IDataObject[] = [];
	let startingAfter: string | undefined;

	for (;;) {
		const response = (await twentyApiRequest.call(this, 'GET', path, {
			...qs,
			limit: Math.min(PAGE_SIZE, limit - items.length),
			...(startingAfter && { starting_after: startingAfter }),
		})) as TwentyListResponse;

		items.push(...(Object.values(response.data)[0] ?? []));

		if (items.length >= limit || !response.pageInfo.hasNextPage || !response.pageInfo.endCursor) {
			return items.slice(0, limit);
		}
		startingAfter = response.pageInfo.endCursor;
	}
}

/** Single-record responses nest the record under a key named after the operation (`createPerson`, ...). */
export function unwrapRecord(response: unknown): IDataObject {
	return Object.values((response as { data: Record<string, IDataObject> }).data)[0];
}

/** Bulk responses nest the records under a key named after the operation (`createPeople`, ...). */
export function unwrapRecords(response: unknown): IDataObject[] {
	return Object.values((response as { data: Record<string, IDataObject[]> }).data)[0];
}
