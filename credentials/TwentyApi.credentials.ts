import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TwentyApi implements ICredentialType {
	name = 'twentyApi';

	displayName = 'Twenty API';

	icon: Icon = { light: 'file:../icons/twenty.svg', dark: 'file:../icons/twenty.dark.svg' };

	documentationUrl = 'https://docs.twenty.com/developers/extend/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create one in Twenty under Settings → APIs & Webhooks',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.twenty.com',
			required: true,
			description:
				'Use https://api.twenty.com for Twenty Cloud, or the URL of your self-hosted server (e.g. http://localhost:3000)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/rest/metadata/objects',
			qs: { limit: 1 },
		},
	};
}
