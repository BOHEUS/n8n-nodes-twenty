import { NodeApiError, type IDataObject, type IHookFunctions, type JsonObject } from 'n8n-workflow';
import { twentyApiRequest } from './transport';

export interface TwentyWebhook {
	id: string;
	targetUrl: string;
	operations: string[];
}

// Twenty answers a missing webhook with a 400 coded WEBHOOK_NOT_FOUND; other versions use a 404.
function isNotFound(error: unknown): boolean {
	const { httpCode, context } = error as NodeApiError;
	return (
		String(httpCode) === '404' ||
		(context?.data as { code?: unknown } | undefined)?.code === 'WEBHOOK_NOT_FOUND'
	);
}

export async function getWebhook(
	this: IHookFunctions,
	id: string,
): Promise<TwentyWebhook | undefined> {
	try {
		const webhook = await twentyApiRequest.call(
			this,
			'GET',
			`/rest/metadata/webhooks/${encodeURIComponent(id)}`,
		);
		return (webhook as Partial<TwentyWebhook> | undefined)?.id
			? (webhook as unknown as TwentyWebhook)
			: undefined;
	} catch (error) {
		if (isNotFound(error)) return undefined;
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function createWebhook(
	this: IHookFunctions,
	body: { targetUrl: string; operations: string[]; secret: string; description: string },
): Promise<TwentyWebhook> {
	return (await twentyApiRequest.call(
		this,
		'POST',
		'/rest/metadata/webhooks',
		{},
		body as unknown as IDataObject,
	)) as unknown as TwentyWebhook;
}

export async function deleteWebhook(this: IHookFunctions, id: string): Promise<void> {
	try {
		await twentyApiRequest.call(
			this,
			'DELETE',
			`/rest/metadata/webhooks/${encodeURIComponent(id)}`,
		);
	} catch (error) {
		if (!isNotFound(error)) throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
