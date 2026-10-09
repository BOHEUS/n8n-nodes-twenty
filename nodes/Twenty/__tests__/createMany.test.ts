/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IDataObject } from 'n8n-workflow';
import { createMany } from '../operations/createMany';

const schema = [{ id: 'address', type: 'object' }];

function contextFor(addresses: string[], continueOnFail: boolean) {
	const sent: IDataObject[][] = [];
	const context = {
		getInputData: () => addresses.map(() => ({ json: {} })),
		getNodeParameter: (name: string, itemIndex: number) =>
			name === 'object'
				? 'companies'
				: { mappingMode: 'defineBelow', schema, value: { address: addresses[itemIndex] } },
		getNode: () => ({ name: 'Twenty' }),
		continueOnFail: () => continueOnFail,
		getCredentials: async () => ({ baseUrl: 'https://twenty.example' }),
		helpers: {
			httpRequestWithAuthentication: async (_: string, { body }: { body: IDataObject[] }) => {
				sent.push(body);
				return {
					data: { createCompanies: body.map((record, n) => ({ id: `id-${n}`, ...record })) },
				};
			},
		},
	};
	return { context, sent };
}

describe('createMany', () => {
	it('creates the valid items and reports the invalid one on its own, in input order', async () => {
		const { context, sent } = contextFor(
			['{"addressCity":"A"}', '{nope', '{"addressCity":"C"}'],
			true,
		);
		const output = await createMany.call(context as never);

		assert.equal(sent.length, 1);
		assert.equal(sent[0].length, 2);
		assert.deepEqual(
			output.map(({ json, pairedItem }) => [
				(pairedItem as { item: number }).item,
				'error' in json,
			]),
			[
				[0, false],
				[1, true],
				[2, false],
			],
		);
	});

	it('fails on the invalid item when not continuing on failure', async () => {
		const { context, sent } = contextFor(['{"addressCity":"A"}', '{nope'], false);
		await assert.rejects(createMany.call(context as never), (error: { context: IDataObject }) => {
			assert.equal(error.context.itemIndex, 1);
			return true;
		});
		assert.equal(sent.length, 0);
	});
});
