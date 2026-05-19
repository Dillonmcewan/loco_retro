import { routePartykitRequest } from 'partyserver';
import { YServer } from 'y-partyserver';

export class RetroRoom extends YServer {
	// Opt into Cloudflare's WebSocket Hibernation API. Required for correct
	// binary message handling: without it, partyserver subscribes to the
	// `message` event and forwards `event.data` (a Blob on the Workers
	// runtime) to y-partyserver, whose decoder expects an ArrayBuffer and
	// silently produces an empty buffer — throwing "Unexpected end of array"
	// on every incoming Yjs sync frame. Hibernation also lets the DO sleep
	// between messages, which is the right cost posture for an idle relay.
	static options = { hibernate: true };
}

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
