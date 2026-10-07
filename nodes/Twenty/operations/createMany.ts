import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { buildRecord } from '../shared/buildRecord';
import { toNodeError } from '../shared/errors';
import { twentyApiRequest, unwrapRecords } from '../shared/transport';

// Twenty accepts up to 60 records per batch request.
const BATCH_SIZE = 60;

/** Creates one record per input item, sending them to Twenty in batches instead of one by one. */
export async function createMany(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const object = this.getNodeParameter('object', 0) as string;
	const returnData: INodeExecutionData[] = [];

	for (let start = 0; start < items.length; start += BATCH_SIZE) {
		const itemIndexes = items.slice(start, start + BATCH_SIZE).map((_, offset) => start + offset);

		try {
			const records = itemIndexes.map((i) => buildRecord.call(this, i));
			const response = await twentyApiRequest.call(
				this,
				'POST',
				`/rest/batch/${object}`,
				{},
				records,
			);

			// Records come back in the order they were sent.
			unwrapRecords(response).forEach((json, position) => {
				returnData.push({ json, pairedItem: { item: itemIndexes[position] } });
			});
		} catch (error) {
			if (this.continueOnFail()) {
				for (const i of itemIndexes) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
				}
				continue;
			}
			throw toNodeError(this.getNode(), error, itemIndexes[0]);
		}
	}

	return returnData;
}
