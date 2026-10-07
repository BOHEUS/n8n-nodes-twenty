import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
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
	body?: IDataObject,
): Promise<T> {
	const { baseUrl } = await this.getCredentials('twentyApi');

	return (await this.helpers.httpRequestWithAuthentication.call(this, 'twentyApi', {
		method,
		url: `${String(baseUrl).replace(/\/$/, '')}${path}`,
		qs,
		body,
		json: true,
	})) as T;
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
