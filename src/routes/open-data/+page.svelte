<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { getLocale } from '$lib/i18n';
	import * as m from '$lib/paraglide/messages';
	import { timeAgo } from '$lib/time';
	import { browser } from '$app/environment';
	import { Check, Download } from 'lucide-svelte';

	const { data } = $props();

	type LiveInfo = {
		hash: string | null;
		date: string | null;
		collections: Record<string, number>;
		bundleSize: number | null;
	};
	// undefined = not checked yet, null = unavailable, object = loaded
	let live = $state<Record<string, LiveInfo | null>>({});

	$effect(() => {
		if (!browser) return;
		for (const ds of data.datasets) {
			fetch(ds.buildEndpoint)
				.then((r) => (r.ok ? r.json() : null))
				.then((j) => {
					live[ds.id] = j
						? {
								hash: j.commit?.hash ?? null,
								date: j.commit?.date ?? j.generated ?? null,
								collections: j.collections ?? {},
								bundleSize: j.bundle?.size ?? null
						}
						: null;
				})
				.catch(() => {
					live[ds.id] = null;
				});
		}
	});

	function formatDate(iso: string): string {
		if (!iso) return 'unknown';
		return new Date(iso).toLocaleString(getLocale(), {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatBytes(bytes: number | null): string {
		if (bytes == null) return 'unknown';
		const units = ['B', 'KB', 'MB', 'GB'];
		let value = bytes;
		let unit = 0;
		while (value >= 1024 && unit < units.length - 1) {
			value /= 1024;
			unit += 1;
		}
		return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
	}

	function datasetName(id: string): string {
		if (id === 'glossary') return m.glossary_label();
		if (id === 'books') return m.books_page_label();
		if (id === 'writings') return m.writings_page_label();
		if (id === 'people') return m.people_label();
		if (id === 'talks') return m.talks_page_label();
		if (id === 'events') return m.events_label();
		return id;
	}

	function datasetDescription(id: string): string {
		if (id === 'glossary') return m.data_glossary_desc();
		if (id === 'books') return m.data_books_desc();
		if (id === 'writings') return m.data_writings_desc();
		if (id === 'people') return m.data_people_desc();
		if (id === 'talks') return m.data_talks_desc();
		if (id === 'events') return m.data_events_desc();
		return '';
	}

	function highlightJson(raw: string): string {
		return raw
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(
				/("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
				(match) => {
					if (match.endsWith(':')) return `<span class="jk">${match}</span>`;
					if (match.startsWith('"')) return `<span class="js">${match}</span>`;
					if (match === 'true' || match === 'false') return `<span class="jb">${match}</span>`;
					if (match === 'null') return `<span class="jn">${match}</span>`;
					return `<span class="ji">${match}</span>`;
				}
			);
	}

	const examples = [
		{ label: 'glossary build', url: 'https://glossary.data.heterarchy.fyi/build.json' },
		{ label: 'glossary bundle', url: 'https://glossary.data.heterarchy.fyi/' },
		{ label: 'terms index', url: 'https://glossary.data.heterarchy.fyi/terms-index.json' },
		{ label: 'term: bittorrent', url: 'https://glossary.data.heterarchy.fyi/terms/bittorrent.json' },
		{ label: 'term: heterarchy', url: 'https://glossary.data.heterarchy.fyi/terms/heterarchy.json' },
		{ label: 'books bundle', url: 'https://books.data.heterarchy.fyi/index.json' },
		{ label: 'book: 1984', url: 'https://books.data.heterarchy.fyi/books/1984.json' },
		{ label: 'history: 1984', url: 'https://books.data.heterarchy.fyi/history/1984.json' },
		{ label: 'people bundle', url: 'https://people.data.heterarchy.fyi/' }
	];

	let url = $state(examples[0].url);
	let loading = $state(false);
	let response = $state<string | null>(null);
	let status = $state<{ code: number; text: string; size: string; ms: number } | null>(null);
	let error = $state<string | null>(null);
	let truncated = $state(false);

	const MAX_LINES = 200;

	async function runFetch() {
		loading = true;
		// keep old response visible while loading — clearing it shrinks the page and causes scroll jump
		const t0 = Date.now();
		try {
			const res = await fetch(url);
			const text = await res.text();
			const ms = Date.now() - t0;
			const kb = (new TextEncoder().encode(text).byteLength / 1024).toFixed(1);
			status = { code: res.status, text: res.statusText, size: `${kb} KB`, ms };
			error = null;
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const json = JSON.parse(text);
			const pretty = JSON.stringify(json, null, 2);
			const lines = pretty.split('\n');
			truncated = false;
			if (lines.length > MAX_LINES) {
				response = lines.slice(0, MAX_LINES).join('\n') + '\n…';
				truncated = true;
			} else {
				response = pretty;
			}
		} catch (e: any) {
			error = e.message ?? 'Failed to fetch';
			response = null;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{m.data_label()} — The Heterarchy Society</title>
	<meta name="description" content={m.data_lead()} />
</svelte:head>

<Seo title="{m.data_label()} — The Heterarchy Society" description={m.data_lead()} />

<div class="min-h-screen w-full">
	<Header />

	<main>
		<section class="cell-roomy">
			<p class="label">{m.data_label()}</p>
			<p class="page-lead mb-6">{m.data_lead()}</p>
			<p class="mb-12 max-w-3xl text-[16px] leading-[1.7] text-black/75">{m.data_intro()}</p>

			<p class="mb-3 font-mono text-[11px] text-black/35">{m.data_live_note()}</p>
			<div class="overflow-x-auto border-y border-line">
				<table class="w-full min-w-[820px] border-collapse font-mono text-[12px]">
					<thead>
						<tr class="border-b border-line text-left text-[10px] uppercase tracking-widest text-black/35">
							<th class="py-3 pr-10 font-normal">{m.data_dataset()}</th>
							<th class="py-3 pr-6 font-normal">{m.data_collection()}</th>
							<th class="py-3 pr-6 font-normal">{m.data_count()}</th>
							<th class="py-3 pr-6 font-normal">{m.data_bundle_size()}</th>
							<th class="py-3 pr-6 font-normal">{m.data_commit()}</th>
							<th class="py-3 font-normal">{m.data_updated()}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.datasets as dataset}
					{@const liveDs = live[dataset.id]}
								{#each dataset.collections as collection, i}
							{@const liveCount = liveDs?.collections?.[collection.name]}
							{@const liveBundleSize = liveDs?.bundleSize}
							{@const countChanged = liveCount != null && liveCount !== collection.count}
							{@const bundleSizeChanged = liveBundleSize != null && liveBundleSize !== dataset.bundleSize}
							{@const commitChanged = !!liveDs?.hash && !!dataset.commit && liveDs.hash !== dataset.commit}
							{@const rowBehind = countChanged || bundleSizeChanged || commitChanged}
								<tr class="align-top {i === dataset.collections.length - 1 ? 'border-b border-line' : ''}">
									{#if i === 0}
										<td rowspan={dataset.collections.length} class="py-5 pr-10 align-top">
											<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
												<a href={dataset.repository} target="_blank" rel="noopener noreferrer" class="link-external text-[14px] text-black">{datasetName(dataset.id)}</a>
												<span class="font-mono text-[11px] text-black/35">mirrors:
													{#if dataset.radicle}<a href={dataset.radicle} target="_blank" rel="noopener noreferrer" class="text-black/40 no-underline hover:text-black/70">radicle</a>{/if}{#if dataset.radicle && dataset.github}<span class="text-black/25">,</span>{/if}
													{#if dataset.github}<a href={dataset.github} target="_blank" rel="noopener noreferrer" class="text-black/40 no-underline hover:text-black/70">github</a>{/if}
												</span>
											</div>
											<p class="mt-1 max-w-[13rem] font-sans text-[13px] leading-[1.55] text-black/55">{datasetDescription(dataset.id)}</p>
											<div class="mt-3">
												<a href={dataset.endpoint} target="_blank" rel="noopener noreferrer" class="link-external break-all text-[11px] text-black/45">{dataset.endpointLabel}</a>
											</div>
										</td>
									{/if}
									<td class="py-5 pr-6 text-black/65">
									<span class="inline-flex items-center gap-2">
										{#if liveDs}{#if rowBehind}<span class="size-1.5 shrink-0 rounded-full bg-amber-500" title={m.data_live_behind()}></span>{:else}<span class="inline-flex text-green-600" title={m.data_live_current()}><Check size={13} strokeWidth={2.5} /></span>{/if}{/if}
										{collection.name}
									</span>
									</td>
										<td class="py-5 pr-6 tabular-nums text-black/65">{collection.count ?? 'unknown'}{#if countChanged}<span class="ml-1 text-amber-600">→ {liveCount}</span>{/if}</td>
										{#if i === 0}
											<td rowspan={dataset.collections.length} class="py-5 pr-6 align-top tabular-nums text-black/65">
												<div class="flex items-center gap-2">
													<span>{formatBytes(dataset.bundleSize)}{#if bundleSizeChanged}<span class="ml-1 text-amber-600">→ {formatBytes(liveBundleSize)}</span>{/if}</span>
													<a
														href={dataset.bundleUrl}
														download
														class="inline-flex size-6 shrink-0 items-center justify-center border border-line text-black/35 transition-colors hover:border-black/30 hover:text-black/70"
														title={m.data_bundle_download()}
														aria-label={m.data_bundle_download()}
													>
														<Download size={13} strokeWidth={2} />
													</a>
												</div>
											</td>
										{/if}
										<td class="py-5 pr-6 text-black/65">
										{#if dataset.commit}
											<a href="{dataset.repository}/commit/{dataset.commit}" target="_blank" rel="noopener noreferrer" class="link-external tabular-nums text-black/70">{dataset.commit.slice(0, 7)}</a>{#if commitChanged && liveDs?.hash}<a href="{dataset.repository}/commit/{liveDs.hash}" target="_blank" rel="noopener noreferrer" class="ml-1 tabular-nums text-amber-600 no-underline hover:underline">→ {liveDs.hash.slice(0, 7)}</a>{/if}
										{:else}
											<span>unknown</span>
										{/if}
									</td>
									<td class="py-5 whitespace-nowrap tabular-nums text-black/65">
										{#if dataset.updatedAt}
											<a href={collection.changelogPath} class="hover:text-black">{formatDate(dataset.updatedAt)}</a>
											<span class="mt-1 block text-black/25">({timeAgo(dataset.updatedAt, getLocale())})</span>{#if commitChanged && liveDs?.date}<span class="mt-1 block text-amber-600">→ {timeAgo(liveDs.date, getLocale())}</span>{/if}
										{:else}
											<span>unknown</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/each}
					</tbody>
				</table>
			</div>

			<section class="mt-12 border-t border-line pt-8">
				<p class="label mb-4">{m.data_usage_label()}</p>
				<p class="max-w-3xl text-[15px] leading-[1.7] text-black/75">{m.data_usage_body()}</p>
			</section>

			<section class="mt-12 border-t border-line pt-8">
				<p class="label mb-4">{m.data_playground_label()}</p>

				<div class="flex flex-wrap gap-2 mb-4">
					{#each examples as ex}
						<button
							type="button"
							onclick={() => { url = ex.url; runFetch(); }}
							class="border border-line px-3 py-1 font-mono text-[11px] text-black/50 transition-colors hover:border-black/30 hover:text-black/75 {url === ex.url ? 'border-black/30 text-black/75' : ''}"
						>{ex.label}</button>
					{/each}
				</div>

				<div class="flex gap-2">
					<input
						type="text"
						bind:value={url}
						class="min-w-0 flex-1 border border-line bg-transparent px-3 py-2 font-mono text-[12px] text-black/70 outline-none focus:border-black/30"
						spellcheck="false"
					/>
					<button
						type="button"
						onclick={runFetch}
						disabled={loading}
						class="border border-line px-4 py-2 font-mono text-[12px] text-black/60 transition-colors hover:border-black/30 hover:text-black disabled:opacity-40"
					>{loading ? m.data_playground_fetching() : m.data_playground_fetch()}</button>
				</div>

				{#if response !== null || error !== null}
					<div class="mt-3 border border-line bg-bg-muted transition-opacity {loading ? 'opacity-40' : ''}">
						<div class="flex items-baseline gap-3 border-b border-line px-4 py-2 font-mono text-[11px]">
							{#if status}
								<span class="{status.code < 400 ? 'text-black/70' : 'text-red-600'} font-medium">{status.code} {status.text}</span>
								<span class="text-black/30">{status.size}</span>
								<span class="text-black/30">{status.ms} ms</span>
							{/if}
							{#if error && !status}
								<span class="text-red-600">{error}</span>
							{/if}
						</div>
						{#if error}
							<p class="p-4 font-mono text-[12px] text-red-600">{error}</p>
						{:else}
							<pre class="json-output p-4 font-mono text-[12px] leading-[1.6]">{@html highlightJson(response ?? '')}</pre>
							{#if truncated}
								<p class="border-t border-line px-4 py-2 font-mono text-[11px] text-black/35">{m.data_playground_truncated({ lines: MAX_LINES })}</p>
							{/if}
						{/if}
					</div>
				{/if}
			</section>
		</section>
	</main>

	<Footer />
</div>

<style>
	.json-output {
		white-space: pre-wrap;
		overflow-wrap: break-word;
		color: rgba(0, 0, 0, 0.5);
	}
	.json-output :global(.jk) { color: rgba(0, 0, 0, 0.8); }
	.json-output :global(.js) { color: rgba(60, 100, 60, 0.85); }
	.json-output :global(.ji) { color: rgba(140, 80, 20, 0.85); }
	.json-output :global(.jb) { color: rgba(80, 60, 140, 0.85); }
	.json-output :global(.jn) { color: rgba(0, 0, 0, 0.3); }
</style>
