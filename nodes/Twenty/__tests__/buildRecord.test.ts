/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IDataObject } from 'n8n-workflow';
import { buildRecord } from '../shared/buildRecord';

const schema = [
	{ id: 'name', type: 'string' },
	{ id: 'address', type: 'object' },
	{ id: 'removed', type: 'string', removed: true },
];

function contextFor(mapper: IDataObject, input: IDataObject = {}) {
	return {
		getNodeParameter: () => ({ schema, ...mapper }),
		getInputData: () => [{ json: input }],
		getNode: () => ({ name: 'Twenty' }),
	};
}

describe('buildRecord', () => {
	it('uses the values set by hand and parses JSON-typed fields', () => {
		const context = contextFor({
			mappingMode: 'defineBelow',
			value: { name: 'Acme', address: '{"addressCity":"Warsaw"}' },
		});
		assert.deepEqual(buildRecord.call(context as never, 0), {
			name: 'Acme',
			address: { addressCity: 'Warsaw' },
		});
	});

	it('maps only the input fields that exist in the schema when auto-mapping', () => {
		const context = contextFor(
			{ mappingMode: 'autoMapInputData' },
			{ name: 'Acme', stray: 1, removed: 'x' },
		);
		assert.deepEqual(buildRecord.call(context as never, 0), { name: 'Acme' });
	});

	it('rejects invalid JSON in a JSON-typed field', () => {
		const context = contextFor({ mappingMode: 'defineBelow', value: { address: '{nope' } });
		assert.throws(() => buildRecord.call(context as never, 0), /not valid JSON/);
	});
});
