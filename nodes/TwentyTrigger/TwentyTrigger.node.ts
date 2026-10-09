import { randomBytes } from 'node:crypto';
import {
	NodeConnectionTypes,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { getEventObjects } from '../Twenty/loadOptions/getEventObjects';
import { createWebhook, deleteWebhook, getWebhook } from '../Twenty/shared/webhooks';
import { isSignedBy } from './signature';

function getOperations(context: IHookFunctions): string[] {
	const object = context.getNodeParameter('object') as string;
	const events = context.getNodeParameter('events') as string[];
	return events.map((event) => `${object}.${event}`);
}

interface WebhookState {
	[webhookUrl: string]: { id: string; secret: string } | undefined;
}

// A trigger has no input an AI agent could call, so it cannot be a tool.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class TwentyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twenty Trigger',
		name: 'twentyTrigger',
		icon: { light: 'file:../../icons/twenty.svg', dark: 'file:../../icons/twenty.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["object"] + ": " + $parameter["events"].join(", ")}}',
		description: 'Starts the workflow when a record changes in your Twenty workspace',
		defaults: {
			name: 'Twenty Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'twentyApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Object Name or ID',
				name: 'object',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getEventObjects' },
				default: '*',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{ name: 'Created', value: 'created' },
					{ name: 'Deleted (Moved to Trash)', value: 'deleted' },
					{ name: 'Destroyed (Deleted for Good)', value: 'destroyed' },
					{ name: 'Restored', value: 'restored' },
					{ name: 'Updated', value: 'updated' },
				],
				default: ['created'],
				required: true,
				description: 'The changes that start the workflow',
			},
		],
	};

	methods = {
		loadOptions: {
			getEventObjects,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const known = (this.getWorkflowStaticData('node') as WebhookState)[webhookUrl];
				if (!known) return false;

				// A webhook left over from another object or event list must be replaced.
				const webhook = await getWebhook.call(this, known.id);
				const operations = getOperations(this);
				return (
					webhook?.targetUrl === webhookUrl &&
					webhook.operations.length === operations.length &&
					operations.every((operation) => webhook.operations.includes(operation))
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const state = this.getWorkflowStaticData('node') as WebhookState;
				const secret = randomBytes(32).toString('hex');

				// Replacing a stale webhook: remove it so Twenty stops calling with the old secret.
				const stale = state[webhookUrl];
				if (stale) await deleteWebhook.call(this, stale.id).catch(() => undefined);

				const { id } = await createWebhook.call(this, {
					targetUrl: webhookUrl,
					operations: getOperations(this),
					secret,
					description: `n8n: ${this.getWorkflow().name}`,
				});

				state[webhookUrl] = { id, secret };
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const state = this.getWorkflowStaticData('node') as WebhookState;
				const known = state[webhookUrl];
				if (!known) return true;

				try {
					await deleteWebhook.call(this, known.id);
				} catch {
					return false;
				}
				delete state[webhookUrl];
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const webhookUrl = this.getNodeWebhookUrl('default') as string;
		const known = (this.getWorkflowStaticData('node') as WebhookState)[webhookUrl];

		if (!known || !isSignedBy(known.secret, request)) {
			this.getResponseObject().status(401).json({ message: 'Invalid signature' });
			return { noWebhookResponse: true };
		}

		return { workflowData: [this.helpers.returnJsonArray(this.getBodyData())] };
	}
}
