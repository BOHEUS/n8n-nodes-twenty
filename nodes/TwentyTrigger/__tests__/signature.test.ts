/* eslint-disable @n8n/community-nodes/no-restricted-imports -- tests are not shipped, so the n8n Cloud import ban does not apply */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { isSignedBy } from '../signature';

const secret = 'secret';
const body = JSON.stringify({ eventName: 'person.created', record: { id: 'a' } });

function deliver({
	timestamp = Date.now(),
	signedWith = secret,
	payload = body,
	signed = true,
} = {}) {
	const signature = createHmac('sha256', signedWith).update(`${timestamp}:${body}`).digest('hex');
	return {
		headers: {
			'x-twenty-webhook-timestamp': String(timestamp),
			...(signed && { 'x-twenty-webhook-signature': signature }),
		},
		rawBody: Buffer.from(payload),
	};
}

describe('isSignedBy', () => {
	it('accepts a fresh, correctly signed delivery', () => {
		assert.equal(isSignedBy(secret, deliver()), true);
	});

	it('rejects a tampered body, a wrong secret and a missing signature', () => {
		assert.equal(
			isSignedBy(secret, deliver({ payload: body.replace('person', 'company') })),
			false,
		);
		assert.equal(isSignedBy(secret, deliver({ signedWith: 'other' })), false);
		assert.equal(isSignedBy(secret, deliver({ signed: false })), false);
	});

	it('rejects a replayed old delivery and a missing raw body', () => {
		assert.equal(isSignedBy(secret, deliver({ timestamp: Date.now() - 10 * 60 * 1000 })), false);
		assert.equal(isSignedBy(secret, { ...deliver(), rawBody: undefined }), false);
	});

	it('rejects a malformed signature without throwing', () => {
		const request = deliver();
		request.headers['x-twenty-webhook-signature' as never] = 'not-hex' as never;
		assert.equal(isSignedBy(secret, request), false);
	});
});
