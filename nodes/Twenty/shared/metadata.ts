import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { twentyApiRequestAllItems } from './transport';

export interface FieldMetadata {
	name: string;
	label: string;
	type: string;
	isActive: boolean;
	isSystem: boolean;
	isUIReadOnly: boolean;
	isNullable: boolean;
	writability: string;
	defaultValue?: unknown;
	options?: Array<{ value: string; label: string }>;
	settings?: { relationType?: string; joinColumnName?: string };
}

export interface ObjectMetadata {
	nameSingular: string;
	namePlural: string;
	labelPlural: string;
	description?: string;
	isActive: boolean;
	isSystem: boolean;
	fields: FieldMetadata[];
}

export async function getObjectsMetadata(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<ObjectMetadata[]> {
	return (await twentyApiRequestAllItems.call(
		this,
		'/rest/metadata/objects',
	)) as unknown as ObjectMetadata[];
}
