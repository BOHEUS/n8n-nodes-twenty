import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { twentyApiRequestAllItems } from '../shared/transport';

interface ObjectMetadata {
	namePlural: string;
	labelPlural: string;
	description?: string;
	isActive: boolean;
	isSystem: boolean;
}

/** Lists the workspace's objects (standard and custom), so the schema is never hardcoded. */
export async function getObjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const objects = (await twentyApiRequestAllItems.call(
		this,
		'/rest/metadata/objects',
	)) as unknown as ObjectMetadata[];

	return objects
		.filter((object) => object.isActive && !object.isSystem)
		.map((object) => ({
			name: object.labelPlural,
			value: object.namePlural,
			description: object.description || undefined,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
