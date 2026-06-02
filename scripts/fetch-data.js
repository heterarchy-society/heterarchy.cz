import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, '../src/lib/data');
const ARCHIVE_BASE = 'https://archive.pp0.co';

const datasets = [
  {
    id: 'glossary',
    base: 'https://glossary.data.heterarchy.fyi',
    outputKey: 'terms',
  },
  {
    id: 'books',
    base: 'https://books.data.heterarchy.fyi',
    endpoint: '/index.json',
    outputKey: 'books',
    transform: transformBooks,
  },
  {
    id: 'writings',
    base: 'https://writings.data.heterarchy.fyi',
    outputKey: 'writings',
  },
  {
    id: 'talks',
    base: 'https://talks.data.heterarchy.fyi',
    outputKey: 'talks',
    optional: true,
    extras: fetchTalkExtras,
    transform: transformTalks,
    summary: (data) => {
      const matched = (data.talks ?? []).filter((talk) => talk.archiveSrc).length;
      return `${data.talks?.length ?? 0} talks (${matched} with archive source)`;
    },
  },
  {
    id: 'people',
    base: 'https://people.data.heterarchy.fyi',
    outputKey: 'people',
    optional: true,
    transform: transformPeople,
  },
  {
    id: 'events',
    base: 'https://events.data.heterarchy.fyi',
    endpoint: '/index.json',
    outputKey: 'events',
    optional: true,
    transform: transformEvents,
  },
];

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function jsonUrl({ base, endpoint = '/' }) {
  return new URL(endpoint, `${base}/`).href;
}

function writeJson(filename, data) {
  writeFileSync(`${DATA}/${filename}`, JSON.stringify(data, null, 2) + '\n');
}

function title(id) {
  return id.slice(0, 1).toUpperCase() + id.slice(1);
}

function defaultSummary(data, outputKey) {
  return `${data[outputKey]?.length ?? 0} ${outputKey}`;
}

function imageVersions(assets, filename, urlForVersion) {
  const versions = assets?.[filename]?.image?.versions;
  if (!versions) return null;

  const result = {};
  for (const [width, version] of Object.entries(versions)) {
    result[width] = urlForVersion(version);
  }
  return result;
}

function stripAssets(item) {
  const { _assets, ...rest } = item;
  return { item: rest, assets: _assets };
}

async function fetchBuildInfo(dataset) {
  try {
    return await fetchJson(jsonUrl({ ...dataset, endpoint: '/build.json' }));
  } catch (error) {
    console.warn(`⚠ ${dataset.id} build info not fetched: ${error.message}`);
    return null;
  }
}

async function fetchTalkExtras() {
  const archiveData = await fetchJson(`${ARCHIVE_BASE}/index.json`).catch(() => null);
  return {
    archiveById: archiveData
      ? new Map(archiveData.videos.map((video) => [video.id, video]))
      : new Map(),
  };
}

function transformBooks(raw, { base }) {
  return {
    ...raw,
    books: (raw.books ?? []).map((rawBook) => {
      const { item: book, assets } = stripAssets(rawBook);
      if (!book.cover) return book;

      book.coverUrl = `${base}/books/${book.id}/${book.cover}`;
      const versions = imageVersions(assets, book.cover, (version) => `${base}/books/${book.id}/${version.src}`);
      if (versions) book.coverVersions = versions;
      return book;
    }),
  };
}

function transformTalks(raw, { base, extras }) {
  return {
    ...raw,
    talks: (raw.talks ?? []).map((rawTalk) => {
      const { item: talk, assets } = stripAssets(rawTalk);
      if (talk.thumbnail) {
        talk.thumbnailUrl = `${base}/talks/${talk.collection}/${talk.thumbnail}`;
        const dir = talk.thumbnail.includes('/') ? talk.thumbnail.replace(/[^/]+$/, '') : '';
        const versions = imageVersions(
          assets,
          talk.thumbnail,
          (version) => `${base}/talks/${talk.collection}/${dir}${version.src}`,
        );
        if (versions) talk.thumbnailVersions = versions;
      }

      const archive = talk.video?.videoId ? extras.archiveById.get(talk.video.videoId) : null;
      if (archive) {
        talk.archiveSrc = `${ARCHIVE_BASE}${archive.source.path}`;
        talk.archiveDuration = parseFloat(archive.duration);
      }
      return talk;
    }),
  };
}

function transformPeople(raw, { base }) {
  return {
    ...raw,
    people: (raw.people ?? []).map((rawPerson) => {
      const { item: person, assets } = stripAssets(rawPerson);
      const avatarVersions = (filename) =>
        imageVersions(assets, filename, (version) => `${base}/people/${person.id}/${version.src}`);

      if (person.avatar) {
        const versions = avatarVersions(person.avatar);
        if (versions) person.avatarVersions = versions;
      }
      if (person.avatarsAlt?.length) {
        person.avatarsAltVersions = person.avatarsAlt.map((filename) => avatarVersions(filename) ?? null);
      }
      return person;
    }),
  };
}

function transformEvents(raw, { base }) {
  return {
    ...raw,
    events: (raw.events ?? []).map((rawEvent) => {
      const { item: event, assets } = stripAssets(rawEvent);
      if (event.imgs?.length && assets) {
        event.imgVersions = {};
        for (const img of event.imgs) {
          const versions = imageVersions(assets, img.path, (version) => `${base}/events/${event.id}/${version.src}`);
          if (versions) event.imgVersions[img.path] = versions;
        }
      }
      return event;
    }),
  };
}

async function fetchDataset(dataset) {
  const [raw, build, extras] = await Promise.all([
    fetchJson(jsonUrl(dataset)),
    fetchBuildInfo(dataset),
    dataset.extras ? dataset.extras(dataset) : null,
  ]);
  const data = dataset.transform ? dataset.transform(raw, { ...dataset, extras }) : raw;

  writeJson(`${dataset.id}.json`, data);
  const summary = dataset.summary?.(data) ?? defaultSummary(data, dataset.outputKey);
  console.log(`✓ ${title(dataset.id)}: ${summary} → src/lib/data/${dataset.id}.json`);

  return build;
}

const buildInfo = {};

for (const dataset of datasets) {
  try {
    buildInfo[dataset.id] = await fetchDataset(dataset);
  } catch (error) {
    if (!dataset.optional) throw error;
    buildInfo[dataset.id] = null;
    console.warn(`⚠ ${title(dataset.id)} dataset not fetched yet: ${error.message}`);
  }
}

writeJson('builds.json', buildInfo);
console.log('✓ Build info → src/lib/data/builds.json');
