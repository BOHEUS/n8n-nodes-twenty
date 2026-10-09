import type { IDataObject } from 'n8n-workflow';

export interface GetManyOptions {
	filter?: string;
	orderBy?: string;
	depth?: number;
	deleted?: 'exclude' | 'include' | 'only';
}

// Twenty hides trashed records unless the filter mentions `deletedAt`.
const DELETED_FILTERS = {
	include: 'or(deletedAt[is]:NULL,deletedAt[is]:NOT_NULL)',
	only: 'deletedAt[is]:NOT_NULL',
} as const;

/** Turns the Get Many options into Twenty's list query parameters. */
export function buildGetManyQuery({
	filter,
	orderBy,
	depth,
	deleted,
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
		...(depth && { depth }),
	};
}
