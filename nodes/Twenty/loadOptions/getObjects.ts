import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { getObjectsMetadata } from '../shared/metadata';

export async function getObjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const objects = await getObjectsMetadata.call(this);

	return objects
		.filter((object) => object.isActive && !object.isSystem)
		.map((object) => ({
			name: object.labelPlural,
			value: object.namePlural,
			description: object.description || undefined,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
