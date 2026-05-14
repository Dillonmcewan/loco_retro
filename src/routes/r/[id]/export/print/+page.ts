import { error } from '@sveltejs/kit';
import { isRoomId } from '$lib/room';
import type { PageLoad } from './$types';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = ({ params }) => {
	if (!isRoomId(params.id)) {
		throw error(404, 'Room not found');
	}
	return { id: params.id };
};
