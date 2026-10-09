import type { IDataObject } from 'n8n-workflow';

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

export function buildAggregate(aggregations: string): string[] {
	return aggregations
		.split(',')
		.map((aggregation) => aggregation.trim())
		.filter(Boolean);
}
