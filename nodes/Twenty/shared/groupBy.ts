import type { IDataObject } from 'n8n-workflow';

/**
 * Builds Twenty's `group_by` value from a comma-separated list: `industry` groups by a field,
 * `name.firstName` by a sub-field of a composite one, `createdAt:MONTH` by a date part, which
 * Twenty cuts in the given time zone.
 */
export function buildGroupBy(fields: string, timeZone: string): IDataObject[] {
	return fields
		.split(',')
		.map((field) => field.trim())
		.filter(Boolean)
		.map((field) => {
			const [path, granularity] = field.split(':');
			const leaf: IDataObject | true = granularity
				? { granularity: granularity.trim().toUpperCase(), timeZone }
				: true;

			return path
				.split('.')
				.reverse()
				.reduce<IDataObject | true>((inner, key) => ({ [key.trim()]: inner }), leaf) as IDataObject;
		});
}

/** Turns `countNotEmptyId, sumEmployees` into Twenty's `aggregate` value. */
export function buildAggregate(aggregations: string): string[] {
	return aggregations
		.split(',')
		.map((aggregation) => aggregation.trim())
		.filter(Boolean);
}
