export type Column = {
	id: string;
	title: string;
};

export type Template = {
	id: string;
	label: string;
	columns: Column[];
};

export const PRESET_TEMPLATES: readonly Template[] = [
	{
		id: 'wwd-actions',
		label: "Went well / Didn't go well / Actions",
		columns: [
			{ id: 'went-well', title: 'Went well' },
			{ id: 'didnt', title: "Didn't go well" },
			{ id: 'actions', title: 'Actions' }
		]
	},
	{
		id: 'start-stop-continue',
		label: 'Start / Stop / Continue',
		columns: [
			{ id: 'start', title: 'Start' },
			{ id: 'stop', title: 'Stop' },
			{ id: 'continue', title: 'Continue' }
		]
	},
	{
		id: 'mad-sad-glad',
		label: 'Mad / Sad / Glad',
		columns: [
			{ id: 'mad', title: 'Mad' },
			{ id: 'sad', title: 'Sad' },
			{ id: 'glad', title: 'Glad' }
		]
	},
	{
		id: '4ls',
		label: '4Ls',
		columns: [
			{ id: 'liked', title: 'Liked' },
			{ id: 'learned', title: 'Learned' },
			{ id: 'lacked', title: 'Lacked' },
			{ id: 'longed-for', title: 'Longed for' }
		]
	}
] as const;

export const DEFAULT_TEMPLATE_ID = 'wwd-actions';

export function getTemplate(id: string): Template | undefined {
	return PRESET_TEMPLATES.find((t) => t.id === id);
}
