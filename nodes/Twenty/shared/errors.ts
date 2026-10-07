import { NodeApiError, NodeOperationError, type INode, type JsonObject } from 'n8n-workflow';

/** Wraps a failure so n8n can show it against the item that caused it. */
export function toNodeError(node: INode, error: unknown, itemIndex: number): Error {
	if (error instanceof NodeOperationError) {
		return new NodeOperationError(node, error, { itemIndex });
	}
	return new NodeApiError(node, error as JsonObject, { itemIndex });
}
