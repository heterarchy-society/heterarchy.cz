import { datasetConfigs } from '$lib/data/datasets';
import buildsData from '$lib/data/builds.json';
import booksData from '$lib/data/books.json';
import eventsData from '$lib/data/events.json';
import glossaryData from '$lib/data/glossary.json';
import peopleData from '$lib/data/people.json';
import talksData from '$lib/data/talks.json';
import writingsData from '$lib/data/writings.json';

type DatasetId = (typeof datasetConfigs)[number]['id'];
type DataSnapshot = {
	meta?: Record<string, any>;
};
type BuildSnapshot = {
	commit?: { hash?: string; date?: string };
	generated?: string;
	collections?: Record<string, number>;
	bundle?: { file?: string; size?: number };
};

const snapshots: Record<string, DataSnapshot> = {
	glossary: glossaryData,
	writings: writingsData,
	books: booksData,
	people: peopleData,
	talks: talksData,
	events: eventsData
};

const builds = buildsData as Record<string, BuildSnapshot | null>;

function buildJsonUrl(endpoint: string): string {
	return new URL('build.json', endpoint).href;
}

function bundleUrl(endpoint: string, file = 'bundle.tar.zst'): string {
	return new URL(file, endpoint).href;
}

export function load() {
	const datasets = datasetConfigs.map((config) => {
		const snapshot = snapshots[config.id as DatasetId];
		const meta = snapshot?.meta ?? {};
		const build = builds[config.id] ?? null;

		const collections = config.collections.map((col) => ({
			name: col.name,
			changelogPath: col.changelogPath,
			count: meta[col.name]?.count ?? build?.collections?.[col.name] ?? null
		}));

		const latestCollection = collections.reduce(
			(latest: { updatedAt: string | null; commit: string | null } | null, col) => {
				const entry = meta[col.name]?.latestCommit;
				if (!entry?.date) return latest;
				if (!latest?.updatedAt) return { updatedAt: entry.date, commit: entry.hash ?? null };
				return entry.date > latest.updatedAt ? { updatedAt: entry.date, commit: entry.hash ?? null } : latest;
			},
			null
		);

		const datasetCommit = meta.commit ?? build?.commit ?? null;

		return {
			id: config.id,
			endpoint: config.endpoint,
			endpointLabel: config.endpointLabel,
			buildEndpoint: buildJsonUrl(config.endpoint),
			repository: config.repository,
			github: config.github ?? null,
			radicle: config.radicle ?? null,
			commit: datasetCommit?.hash ?? latestCollection?.commit ?? null,
			updatedAt: datasetCommit?.date ?? latestCollection?.updatedAt ?? build?.generated ?? null,
			bundleSize: build?.bundle?.size ?? null,
			bundleUrl: bundleUrl(config.endpoint, build?.bundle?.file),
			totalCount: collections.reduce((sum, col) => sum + (col.count ?? 0), 0) || null,
			collections
		};
	});

	return { datasets };
}
