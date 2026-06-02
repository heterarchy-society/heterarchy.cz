import { forgejoOrg, githubOrg, radicleOrg } from '$lib/data/placeholder';

export type ContactChannel = {
	label: string;
	value: string;
	href?: string;
	external?: boolean;
	logo?: string;
	mirror?: boolean;
	owners?: string[]; // each entry: "person-id|Display Name" or plain name
	ownerRole?: string; // defaults to "Moderators"
};

export type OfflineVenue = ContactChannel & {
	city: string;
	country: string;
};

export const contactIntro = {
	title: 'Kde nás najdete?',
	lead: 'Jsme tam, kde jsou naši lidé.'
};

export const signalGroup: ContactChannel = {
	label: 'Signal',
	value: 'signal.heterarchy.fyi',
	href: 'https://signal.heterarchy.fyi',
	external: true,
	owners: ['tree|tree 木'],
};

export const twitterAccount: ContactChannel = {
	label: 'X (Twitter)',
	value: '@hetarchy',
	href: 'https://x.com/hetarchy',
	external: true,
	owners: ['tree|tree 木'],
	ownerRole: 'Admin',
};

export const onlineChannels: ContactChannel[] = [signalGroup, twitterAccount];

export const gitChannels: ContactChannel[] = [
	{
		label: 'Forgejo',
		value: forgejoOrg.replace('https://', ''),
		href: forgejoOrg,
		external: true,
		owners: ['tree|tree 木'],
	},
	{
		label: 'Radicle',
		value: radicleOrg.replace('https://radicle.network/nodes/', ''),
		href: radicleOrg,
		external: true,
		mirror: true,
		owners: ['tree|tree 木'],
	},
	{
		label: 'GitHub',
		value: githubOrg.replace('https://', ''),
		href: githubOrg,
		external: true,
		mirror: true,
		owners: ['tree|tree 木'],
	}
];

export const offlineIntro = 'Nemáme vlastní prostor. Aktuálně nás hostují tyto místa:';

export const offlineVenues: OfflineVenue[] = [
	{
		label: 'Bordel',
		value: 'bordel.wtf',
		city: 'Praha',
		country: 'Česko',
		href: 'https://bordel.wtf',
		external: true
	}
];

export const contactMeta = {
	title: 'Kde nás najdete? — The Heterarchy Society',
	description: 'Kde najdete The Heterarchy Society — online kanály a git.'
};
