import { NodeApiError, NodeOperationError, type INode, type JsonObject } from 'n8n-workflow';

export function toNodeError(node: INode, error: unknown, itemIndex: number): Error {
	if (error instanceof NodeOperationError) {
		return new NodeOperationError(node, error, { itemIndex });
	}
	// The NodeApiError constructor hands back an existing NodeApiError as is, options included.
	if (error instanceof NodeApiError) {
		error.context.itemIndex = itemIndex;
		return error;
	}
	return new NodeApiError(node, error as JsonObject, { itemIndex });
}
