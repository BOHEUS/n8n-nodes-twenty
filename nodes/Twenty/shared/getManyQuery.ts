import type { IDataObject } from 'n8n-workflow';

export interface GetOptions {
	fields?: string;
	depth?: number;
}

export interface GetManyOptions extends GetOptions {
	filter?: string;
	orderBy?: string;
	deleted?: 'exclude' | 'include' | 'only';
}

// Twenty hides trashed records unless the filter mentions `deletedAt`.
const DELETED_FILTERS = {
	include: 'or(deletedAt[is]:NULL,deletedAt[is]:NOT_NULL)',
	only: 'deletedAt[is]:NOT_NULL',
} as const;

export function buildGetQuery({ fields, depth }: GetOptions): IDataObject {
	return {
		...(fields?.trim() && { fields: fields.trim() }),
		...(depth && { depth }),
	};
}

export function buildGetManyQuery({
	filter,
	orderBy,
	deleted,
	...getOptions
}: GetManyOptions): IDataObject {
	const filters = [
		filter?.trim(),
		deleted && deleted !== 'exclude' ? DELETED_FILTERS[deleted] : undefined,
	].filter(Boolean);

	return {
		...(filters.length > 0 && {
			filter: filters.length > 1 ? `and(${filters.join(',')})` : filters[0],
		}),
		...(orderBy?.trim() && { order_by: orderBy.trim() }),
		...buildGetQuery(getOptions),
	};
}
