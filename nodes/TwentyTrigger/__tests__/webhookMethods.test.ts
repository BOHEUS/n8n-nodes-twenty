/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NodeApiError, type IDataObject, type INode } from 'n8n-workflow';
import { TwentyTrigger } from '../TwentyTrigger.node';

const url = 'https://n8n.example/webhook/abc/webhook';
const node = { name: 'Twenty Trigger' } as INode;
const notFound = () =>
	new NodeApiError(node, Object.assign(new Error('Not found'), { httpCode: '404' }) as never);

function contextFor(serve: (method: string, url: string) => unknown, events = ['created']) {
	const calls: string[] = [];
	const staticData: IDataObject = { [url]: { id: 'wh-1', secret: 's' } };
	const parameters: IDataObject = { object: 'person', events };
	const context = {
		getNodeWebhookUrl: () => url,
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (name: string) => parameters[name],
		getWorkflow: () => ({ name: 'Flow' }),
		getNode: () => node,
		getCredentials: async () => ({ baseUrl: 'https://twenty.example' }),
		helpers: {
			httpRequestWithAuthentication: async (
				_: string,
				options: { method: string; url: string },
			) => {
				calls.push(`${options.method} ${options.url.replace('https://twenty.example', '')}`);
				return serve(options.method, options.url);
			},
		},
	};
	return { context, calls, staticData };
}

const { checkExists, create, delete: remove } = new TwentyTrigger().webhookMethods.default;

describe('Twenty Trigger webhook', () => {
	it('keeps a webhook that matches the node', async () => {
		const { context } = contextFor(() => ({
			id: 'wh-1',
			targetUrl: url,
			operations: ['person.created'],
		}));
		assert.equal(await checkExists.call(context as never), true);
	});

	it('replaces a webhook that is gone or listens to other events', async () => {
		for (const serve of [
			() => '',
			() => {
				throw notFound();
			},
			() => ({ id: 'wh-1', targetUrl: url, operations: ['person.updated'] }),
		]) {
			const { context } = contextFor(serve);
			assert.equal(await checkExists.call(context as never), false);
		}
	});

	it('removes the stale webhook before creating its replacement', async () => {
		const { context, calls, staticData } = contextFor((method) =>
			method === 'POST' ? { id: 'wh-2' } : true,
		);
		assert.equal(await create.call(context as never), true);
		assert.deepEqual(calls, [
			'DELETE /rest/metadata/webhooks/wh-1',
			'POST /rest/metadata/webhooks',
		]);
		assert.equal((staticData[url] as IDataObject).id, 'wh-2');
	});

	it('forgets a webhook that was already removed in Twenty', async () => {
		// Current servers answer 400 WEBHOOK_NOT_FOUND, as n8n wraps it; others answer 404.
		const webhookNotFound = () =>
			new NodeApiError(
				node,
				Object.assign(new Error('Request failed with status code 400'), {
					response: { status: 400, data: { code: 'WEBHOOK_NOT_FOUND' } },
				}) as never,
			);
		for (const failure of [notFound, webhookNotFound]) {
			const { context, staticData } = contextFor(() => {
				throw failure();
			});
			assert.equal(await remove.call(context as never), true);
			assert.equal(staticData[url], undefined);
		}
	});
});
