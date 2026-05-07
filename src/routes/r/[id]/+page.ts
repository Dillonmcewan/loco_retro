import { error } from '@sveltejs/kit';
import { isRoomId } from '$lib/room/id';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!isRoomId(params.id)) {
		throw error(404, 'Room not found');
	}
	return { id: params.id };
};
