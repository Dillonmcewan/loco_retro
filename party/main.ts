import { routePartykitRequest } from 'partyserver';
import { YServer } from 'y-partyserver';

export class RetroRoom extends YServer {}

// Binding is named `Main` (not `RetroRoom`) so the URL path `/parties/main/<id>`
// that y-partyserver's client uses by default resolves to this DO without the
// client having to pass a non-default `party` option. The class itself stays
// `RetroRoom` for readability in code and migrations.
type Env = {
	Main: DurableObjectNamespace;
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
