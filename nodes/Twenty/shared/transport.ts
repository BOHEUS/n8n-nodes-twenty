import {
	NodeApiError,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type JsonObject,
} from 'n8n-workflow';

type TwentyContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

// Record endpoints nest the list under the object's name; metadata endpoints return it directly
// under `data`, or, on older servers, as a bare unpaginated array.
interface TwentyListPage {
	data: IDataObject[] | Record<string, IDataObject[]>;
	pageInfo?: { hasNextPage: boolean; endCursor: string | null };
}
type TwentyListResponse = IDataObject[] | TwentyListPage;

const PAGE_SIZE = 200;

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
		// n8n already throws a NodeApiError here, and its constructor hands an existing one back
		// unchanged, ignoring a `message` option. So the message is set on the error itself.
		const apiError =
			error instanceof NodeApiError ? error : new NodeApiError(this.getNode(), error as JsonObject);
		const message = getTwentyErrorMessage(error);
		if (message) apiError.message = message;
		throw apiError;
	}
}

function getTwentyErrorMessage(error: unknown): string | undefined {
	const { response, context } = error as {
		response?: { body?: unknown; data?: unknown };
		context?: { data?: unknown };
	};
	const body = response?.body ?? response?.data ?? context?.data;
	const messages = (body as { messages?: unknown } | undefined)?.messages;

	return Array.isArray(messages) && messages.length > 0 ? messages.join('; ') : undefined;
}

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
		if (Array.isArray(response)) return response.slice(0, limit);

		const { data, pageInfo } = response;
		items.push(...((Array.isArray(data) ? data : Object.values(data ?? {})[0]) ?? []));

		if (items.length >= limit || !pageInfo?.hasNextPage || !pageInfo.endCursor) {
			return items.slice(0, limit);
		}
		startingAfter = pageInfo.endCursor;
	}
}

export function unwrapRecord(response: unknown): IDataObject {
	return Object.values((response as { data: Record<string, IDataObject> }).data)[0];
}

export function unwrapRecords(response: unknown): IDataObject[] {
	return Object.values((response as { data: Record<string, IDataObject[]> }).data)[0];
}

export function unwrapDuplicates(response: unknown): IDataObject[] {
	return (response as { data: Array<Record<string, IDataObject[]>> }).data.flatMap(
		(group) => Object.values(group)[0],
	);
}
