import { routePartykitRequest } from 'partyserver';
import { YServer } from 'y-partyserver';

export class RetroRoom extends YServer {}

type Env = {
	RetroRoom: DurableObjectNamespace;
};

export default {
	async fetch(request, env) {
		return (
			(await routePartykitRequest(
				request,
				env as unknown as Record<string, DurableObjectNamespace>
			)) ?? new Response('Not Found', { status: 404 })
		);
	}
} satisfies ExportedHandler<Env>;
