import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { twentyApiRequest } from './transport';

export interface TwentyWebhook {
	id: string;
	targetUrl: string;
	operations: string[];
}

/** Webhooks sit under `data` on current servers and are a bare array on older ones. */
export async function listWebhooks(this: IHookFunctions): Promise<TwentyWebhook[]> {
	const response = await twentyApiRequest.call(this, 'GET', '/rest/metadata/webhooks');
	const webhooks = Array.isArray(response) ? response : (response as { data: unknown }).data;

	return (
		Array.isArray(webhooks) ? webhooks : Object.values(webhooks as object)[0]
	) as TwentyWebhook[];
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
	await twentyApiRequest.call(this, 'DELETE', `/rest/metadata/webhooks/${encodeURIComponent(id)}`);
}
