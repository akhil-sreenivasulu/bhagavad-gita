import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CHAPTERS_SHA = '4c1c7e3676ce6c2703b5c071fa4b2ba987adb1d2';
const VERSES_SHA = '7442434baa609e3fc85f6dd90a4124f0b8bb6ccf';
const TRANSLATIONS_SHA = '6d25d4766c0f4ad00841beb3537b993cdd97bbe8';
const ENGLISH_AUTHOR_PREFERENCE = [
  'Swami Adidevananda',
  'Swami Sivananda',
  'Swami Gambirananda',
  'Dr. S. Sankaranarayan',
  'Shri Purohit Swami',
];

function ghApi(path) {
  const stdout = execFileSync('gh', ['api', path], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  return JSON.parse(stdout);
}

function decodeBlobContent(blobResponse) {
  return Buffer.from(blobResponse.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function chapterImage(chapterNumber) {
  const images = [
    'assets/images/gita-100.jpg',
    'assets/images/gita-101.jpg',
    'assets/images/gita-102.jpg',
    'assets/images/gita-103.jpg',
    'assets/images/gita-104.jpg',
    'assets/images/gita-105.jpg',
    'assets/images/gita-106.jpg',
    'assets/images/gita-107.jpg',
    'assets/images/gita-108.jpg',
    'assets/images/gita-109.jpg',
    'assets/images/gita-110.jpg',
    'assets/images/gita-111.jpg',
    'assets/images/gita-112.jpg',
    'assets/images/gita-113.jpg',
    'assets/images/gita-114.jpg',
    'assets/images/gita-116.jpg',
    'assets/images/gita-117.jpg',
    'assets/images/gita-118.jpg',
  ];
  return images[chapterNumber - 1];
}

function chapterAudio(chapterNumber) {
  return `assets/Bhagavad-gita${pad(chapterNumber)}.mp3`;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadDataset(cachePath, sha) {
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }

  return JSON.parse(decodeBlobContent(ghApi(`repos/gita/gita/git/blobs/${sha}`)));
}

const chapters = loadDataset('raw/chapters.json', CHAPTERS_SHA);
const verses = loadDataset('raw/verses.json', VERSES_SHA);
const translations = loadDataset('raw/translations.json', TRANSLATIONS_SHA);

const englishTranslations = translations.filter((entry) => entry.lang === 'english');
const translationsByVerseId = new Map();

for (const entry of englishTranslations) {
  if (!translationsByVerseId.has(entry.verse_id)) {
    translationsByVerseId.set(entry.verse_id, []);
  }
  translationsByVerseId.get(entry.verse_id).push(entry);
}

const versesByChapter = new Map();
for (const verse of verses) {
  if (!versesByChapter.has(verse.chapter_number)) {
    versesByChapter.set(verse.chapter_number, []);
  }
  versesByChapter.get(verse.chapter_number).push(verse);
}

mkdirSync('raw', { recursive: true });
mkdirSync('data', { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'https://github.com/gita/gita',
  chapters: [],
};

for (const chapter of chapters) {
  const chapterNumber = chapter.chapter_number;
  const preferredVerses = (versesByChapter.get(chapterNumber) || [])
    .sort((a, b) => a.verse_number - b.verse_number)
    .map((verse) => {
      const options = translationsByVerseId.get(verse.id) || [];
      const selected =
        ENGLISH_AUTHOR_PREFERENCE.map((name) =>
          options.find((option) => option.authorName === name)
        ).find(Boolean) || options[0];

      return {
        id: verse.id,
        verseNumber: verse.verse_number,
        text: verse.text.replace(/\n+/g, '\n'),
        transliteration: verse.transliteration,
        wordMeanings: verse.word_meanings,
        meaning: selected?.description || verse.word_meanings,
      };
    });

  const chapterPayload = {
    chapterNumber,
    name: chapter.name,
    nameTranslation: chapter.name_translation,
    nameMeaning: chapter.name_meaning,
    summary: chapter.chapter_summary,
    summaryHindi: chapter.chapter_summary_hindi,
    image: chapterImage(chapterNumber),
    audio: chapterAudio(chapterNumber),
    verses: preferredVerses,
  };

  const fileName = `chapter-${pad(chapterNumber)}-${slugify(chapter.name_translation)}.json`;
  writeFileSync(`data/${fileName}`, JSON.stringify(chapterPayload, null, 2));

  manifest.chapters.push({
    chapterNumber,
    nameTranslation: chapter.name_translation,
    nameMeaning: chapter.name_meaning,
    verseCount: preferredVerses.length,
    path: `data/${fileName}`,
    image: chapterPayload.image,
    audio: chapterPayload.audio,
  });
}

writeFileSync('data/manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Built ${manifest.chapters.length} Bhagavad Gita chapters.`);
