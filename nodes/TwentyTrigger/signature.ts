import { createHmac, timingSafeEqual } from 'node:crypto';

// Deliveries older than this are refused, so a captured request cannot be replayed later.
const MAX_AGE_MS = 5 * 60 * 1000;

/** Twenty signs `<timestamp>:<body>` with the webhook's secret (HMAC-SHA256, hex). */
export function isSignedBy(
	secret: string,
	request: { headers: Record<string, unknown>; rawBody?: Buffer },
): boolean {
	const timestamp = String(request.headers['x-twenty-webhook-timestamp'] ?? '');
	const signature = String(request.headers['x-twenty-webhook-signature'] ?? '');
	if (!request.rawBody || !timestamp || !signature) return false;
	if (!(Math.abs(Date.now() - Number(timestamp)) <= MAX_AGE_MS)) return false;

	const expected = createHmac('sha256', secret)
		.update(`${timestamp}:${request.rawBody.toString('utf8')}`)
		.digest();
	const received = Buffer.from(signature, 'hex');

	return received.length === expected.length && timingSafeEqual(received, expected);
}
