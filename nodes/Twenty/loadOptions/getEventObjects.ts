import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getObjectsMetadata } from '../shared/metadata';

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
