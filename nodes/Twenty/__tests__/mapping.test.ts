/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMappingColumns } from '../resourceMapping/getMappingColumns';

const field = (overrides: Record<string, unknown>) => ({
	name: 'f',
	label: 'F',
	type: 'TEXT',
	isActive: true,
	isSystem: false,
	isUIReadOnly: false,
	isNullable: true,
	writability: 'OPEN',
	...overrides,
});

function contextFor(fields: unknown[]) {
	return {
		getNodeParameter: () => 'pets',
		getNode: () => ({ name: 'Twenty' }),
		getCredentials: async () => ({ baseUrl: 'https://twenty.example' }),
		helpers: {
			httpRequestWithAuthentication: async () => ({
				data: [{ namePlural: 'pets', fields }],
				pageInfo: { hasNextPage: false, endCursor: null },
			}),
		},
	};
}

describe('getMappingColumns', () => {
	it('lists the allowed values of a multi-select field in its label', async () => {
		const { fields } = await getMappingColumns.call(
			contextFor([
				field({
					name: 'traits',
					label: 'Traits',
					type: 'MULTI_SELECT',
					options: [
						{ value: 'PLAYFUL', label: 'Playful' },
						{ value: 'SHY', label: 'Shy' },
					],
				}),
			]) as never,
		);
		assert.equal(fields[0].displayName, 'Traits (PLAYFUL, SHY)');
		assert.equal(fields[0].type, 'array');
	});

	it('keeps plain labels for other fields and offers selects as dropdowns', async () => {
		const { fields } = await getMappingColumns.call(
			contextFor([
				field({ name: 'name', label: 'Name' }),
				field({
					name: 'species',
					label: 'Species',
					type: 'SELECT',
					options: [{ value: 'DOG', label: 'Dog' }],
				}),
				field({ name: 'facts', label: 'Facts', type: 'ARRAY' }),
			]) as never,
		);
		assert.deepEqual(
			fields.map(({ displayName }) => displayName),
			['Name', 'Species', 'Facts'],
		);
		assert.deepEqual(fields[1].options, [{ name: 'Dog', value: 'DOG' }]);
	});

	it('skips fields Twenty manages', async () => {
		const { fields } = await getMappingColumns.call(
			contextFor([
				field({ name: 'sys', isSystem: true }),
				field({ name: 'ro', writability: 'READ_ONLY' }),
				field({ name: 'morph', type: 'MORPH_RELATION' }),
			]) as never,
		);
		assert.deepEqual(fields, []);
	});
});
