import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getObjectsMetadata } from '../shared/metadata';

/** Objects a webhook can listen to. Twenty names events after the singular name (`company.created`). */
export async function getEventObjects(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const objects = await getObjectsMetadata.call(this);

	return [
		{ name: 'All Objects', value: '*' },
		...objects
			.filter((object) => object.isActive && !object.isSystem)
			.map((object) => ({ name: object.labelPlural, value: object.nameSingular }))
			.sort((a, b) => a.name.localeCompare(b.name)),
	];
}
