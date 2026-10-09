/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { INode } from 'n8n-workflow';
import { buildCustomRequest, toCustomResponseRecords } from '../shared/customApiCall';
import { buildGetManyQuery, buildGetQuery } from '../shared/getManyQuery';
import { buildAggregate, buildGroupBy } from '../shared/groupBy';

const node = { name: 'Twenty' } as INode;

describe('buildGetManyQuery', () => {
	it('sends nothing for empty options', () => {
		assert.deepEqual(buildGetManyQuery({}), {});
		assert.deepEqual(
			buildGetManyQuery({ filter: ' ', orderBy: '', depth: 0, deleted: 'exclude' }),
			{},
		);
	});

	it('passes filter, order and depth through', () => {
		assert.deepEqual(buildGetManyQuery({ filter: 'name[eq]:"A"', orderBy: 'name', depth: 1 }), {
			filter: 'name[eq]:"A"',
			order_by: 'name',
			depth: 1,
		});
	});

	it('shows trashed records by mentioning deletedAt in the filter', () => {
		assert.deepEqual(buildGetManyQuery({ deleted: 'only' }), { filter: 'deletedAt[is]:NOT_NULL' });
		assert.deepEqual(buildGetManyQuery({ filter: 'name[eq]:"A"', deleted: 'include' }), {
			filter: 'and(name[eq]:"A",or(deletedAt[is]:NULL,deletedAt[is]:NOT_NULL))',
		});
	});

	it('selects fields', () => {
		assert.deepEqual(buildGetManyQuery({ fields: ' id,name ' }), { fields: 'id,name' });
		assert.deepEqual(buildGetQuery({ fields: 'id', depth: 1 }), { fields: 'id', depth: 1 });
	});
});

describe('buildGroupBy', () => {
	it('groups by plain, composite and date fields', () => {
		assert.deepEqual(buildGroupBy('industry, name.firstName ,createdAt:month', 'Europe/Warsaw'), [
			{ industry: true },
			{ name: { firstName: true } },
			{ createdAt: { granularity: 'MONTH', timeZone: 'Europe/Warsaw' } },
		]);
	});

	it('ignores empty entries', () => {
		assert.deepEqual(buildGroupBy(' , ', 'UTC'), []);
		assert.deepEqual(buildAggregate('countNotEmptyId, ,sumEmployees'), [
			'countNotEmptyId',
			'sumEmployees',
		]);
	});
});

describe('buildCustomRequest', () => {
	const request = { method: 'GET', path: '/rest/people', query: '{}', body: '{}' } as const;

	it('accepts a path and parses JSON text', () => {
		assert.deepEqual(buildCustomRequest(node, 0, { ...request, query: '{"limit":2}' }), {
			method: 'GET',
			path: '/rest/people',
			qs: { limit: 2 },
			body: undefined,
		});
		assert.deepEqual(
			buildCustomRequest(node, 0, { ...request, method: 'POST', body: '{"name":"A"}' }).body,
			{ name: 'A' },
		);
	});

	it('accepts objects from expressions', () => {
		assert.deepEqual(buildCustomRequest(node, 0, { ...request, query: { limit: 1 } }).qs, {
			limit: 1,
		});
	});

	it('refuses paths that could leave the Twenty server', () => {
		for (const path of [
			'//evil.example',
			'@evil.example',
			'rest/people',
			'https://evil.example',
			'',
		]) {
			assert.throws(
				() => buildCustomRequest(node, 0, { ...request, path }),
				/must start with a single "\/"/,
			);
		}
	});

	it('refuses invalid JSON', () => {
		assert.throws(
			() => buildCustomRequest(node, 0, { ...request, query: '{nope' }),
			/not valid JSON/,
		);
	});
});

describe('toCustomResponseRecords', () => {
	it('keeps objects, turns an empty body into an empty item and wraps bare values', () => {
		assert.deepEqual(toCustomResponseRecords({ id: 'a' }), [{ id: 'a' }]);
		assert.deepEqual(toCustomResponseRecords([{ id: 'a' }, 'b']), [{ id: 'a' }, { value: 'b' }]);
		assert.deepEqual(toCustomResponseRecords(''), [{}]);
		assert.deepEqual(toCustomResponseRecords(undefined), [{}]);
		assert.deepEqual(toCustomResponseRecords(true), [{ value: true }]);
	});
});
