/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NodeApiError, type IDataObject, type INode } from 'n8n-workflow';
import { toNodeError } from '../shared/errors';
import {
	twentyApiRequest,
	twentyApiRequestAllItems,
	unwrapDuplicates,
	unwrapRecord,
	unwrapRecords,
} from '../shared/transport';

function contextServing(pages: unknown[]) {
	const queries: IDataObject[] = [];
	const context = {
		getCredentials: async () => ({ baseUrl: 'https://twenty.example/' }),
		getNode: () => ({ name: 'Twenty' }),
		helpers: {
			httpRequestWithAuthentication: async (_: string, options: { qs: IDataObject }) => {
				queries.push(options.qs);
				return pages[queries.length - 1];
			},
		},
	};
	return { context, queries };
}

const page = (data: unknown, endCursor: string | null) => ({
	data,
	pageInfo: { hasNextPage: endCursor !== null, endCursor },
});

describe('twentyApiRequestAllItems', () => {
	it('reads records keyed by object name', async () => {
		const { context } = contextServing([page({ people: [{ id: 'a' }] }, null)]);
		assert.deepEqual(await twentyApiRequestAllItems.call(context as never, '/rest/people'), [
			{ id: 'a' },
		]);
	});

	// Current servers return metadata lists as a bare array; older ones key them by name.
	it('reads metadata lists returned as an array', async () => {
		const { context } = contextServing([page([{ id: 'a' }], null)]);
		assert.deepEqual(
			await twentyApiRequestAllItems.call(context as never, '/rest/metadata/objects'),
			[{ id: 'a' }],
		);
	});

	it('follows the cursor and stops at the limit', async () => {
		const { context, queries } = contextServing([
			page({ people: [{ id: 'a' }, { id: 'b' }] }, 'cursor-1'),
			page({ people: [{ id: 'c' }, { id: 'd' }] }, 'cursor-2'),
		]);
		const items = await twentyApiRequestAllItems.call(
			context as never,
			'/rest/people',
			{ filter: 'f' },
			3,
		);
		assert.deepEqual(items, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
		assert.deepEqual(queries, [
			{ filter: 'f', limit: 3 },
			{ filter: 'f', limit: 1, starting_after: 'cursor-1' },
		]);
	});

	it('reads a bare array and a page without pageInfo, as older servers send', async () => {
		const bare = contextServing([[{ id: 'a' }, { id: 'b' }]]);
		assert.deepEqual(
			await twentyApiRequestAllItems.call(bare.context as never, '/rest/metadata/objects', {}, 1),
			[{ id: 'a' }],
		);
		const noPageInfo = contextServing([{ data: [{ id: 'a' }] }]);
		assert.deepEqual(
			await twentyApiRequestAllItems.call(noPageInfo.context as never, '/rest/metadata/objects'),
			[{ id: 'a' }],
		);
	});

	it('treats an empty page as no records', async () => {
		const { context } = contextServing([page({}, null)]);
		assert.deepEqual(await twentyApiRequestAllItems.call(context as never, '/rest/people'), []);
	});
});

describe('response unwrapping', () => {
	it('unwraps one record, many records and duplicate groups', () => {
		assert.deepEqual(unwrapRecord({ data: { createPerson: { id: 'a' } } }), { id: 'a' });
		assert.deepEqual(unwrapRecords({ data: { createPeople: [{ id: 'a' }] } }), [{ id: 'a' }]);
		assert.deepEqual(
			unwrapDuplicates({
				data: [{ personDuplicates: [{ id: 'a' }] }, { personDuplicates: [{ id: 'b' }] }],
			}),
			[{ id: 'a' }, { id: 'b' }],
		);
	});
});

describe('errors', () => {
	const node = { name: 'Twenty' } as INode;
	// n8n's request helper fails with a NodeApiError around the HTTP error, as here.
	const httpError = Object.assign(new Error('Request failed with status code 400'), {
		response: { status: 400, data: { messages: ['Object person doesn\'t have any "x" field.'] } },
	});

	it("surfaces Twenty's message from an error n8n already wrapped", async () => {
		const context = {
			getCredentials: async () => ({ baseUrl: 'https://twenty.example' }),
			getNode: () => node,
			helpers: {
				httpRequestWithAuthentication: async () => {
					throw new NodeApiError(node, httpError as never);
				},
			},
		};
		await assert.rejects(twentyApiRequest.call(context as never, 'GET', '/rest/people'), {
			message: 'Object person doesn\'t have any "x" field.',
		});
	});

	it('links an API error to its item', () => {
		const error = toNodeError(node, new NodeApiError(node, httpError as never), 3);
		assert.equal((error as NodeApiError).context.itemIndex, 3);
	});
});
