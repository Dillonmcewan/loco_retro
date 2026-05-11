import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

export default class RetroRoom implements Party.Server {
	constructor(readonly party: Party.Party) {}

	onConnect(conn: Party.Connection) {
		return onConnect(conn, this.party, {
			persist: { mode: 'snapshot' }
		});
	}
}
