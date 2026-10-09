import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { buildRecord } from '../shared/buildRecord';
import { toNodeError } from '../shared/errors';
import { twentyApiRequest, unwrapRecords } from '../shared/transport';

const BATCH_SIZE = 200;

export async function createMany(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const object = this.getNodeParameter('object', 0) as string;
	const returnData: INodeExecutionData[] = [];

	const fail = (error: unknown, itemIndexes: number[]) => {
		if (!this.continueOnFail()) throw toNodeError(this.getNode(), error, itemIndexes[0]);
		for (const i of itemIndexes) {
			returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
		}
	};

	// Built one by one, so an item with a bad value fails alone instead of taking its batch down.
	const valid: Array<{ itemIndex: number; record: IDataObject }> = [];
	for (let i = 0; i < items.length; i++) {
		try {
			valid.push({ itemIndex: i, record: buildRecord.call(this, i) });
		} catch (error) {
			fail(error, [i]);
		}
	}

	for (let start = 0; start < valid.length; start += BATCH_SIZE) {
		const batch = valid.slice(start, start + BATCH_SIZE);

		try {
			const response = await twentyApiRequest.call(
				this,
				'POST',
				`/rest/batch/${object}`,
				{},
				batch.map(({ record }) => record),
			);

			unwrapRecords(response).forEach((json, position) => {
				returnData.push({ json, pairedItem: { item: batch[position].itemIndex } });
			});
		} catch (error) {
			fail(
				error,
				batch.map(({ itemIndex }) => itemIndex),
			);
		}
	}

	return returnData.sort(
		(a, b) => (a.pairedItem as { item: number }).item - (b.pairedItem as { item: number }).item,
	);
}
