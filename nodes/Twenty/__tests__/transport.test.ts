/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IDataObject } from 'n8n-workflow';
import {
	twentyApiRequestAllItems,
	unwrapDuplicates,
	unwrapRecord,
	unwrapRecords,
} from '../shared/transport';

/** A stand-in for n8n's execution context that serves the given pages and records the queries. */
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
