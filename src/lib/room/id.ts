const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RoomId = string;

export function generateRoomId(): RoomId {
	return crypto.randomUUID();
}

export function isRoomId(value: unknown): value is RoomId {
	return typeof value === 'string' && UUID_V4.test(value);
}
