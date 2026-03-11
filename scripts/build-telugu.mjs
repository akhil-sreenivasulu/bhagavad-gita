import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const CHAPTER_DIR = 'data';
const TRANSLATE_ENDPOINT =
  'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=te&dt=t&q=';

const independentVowels = {
  अ: 'అ',
  आ: 'ఆ',
  इ: 'ఇ',
  ई: 'ఈ',
  उ: 'ఉ',
  ऊ: 'ఊ',
  ऋ: 'ఋ',
  ॠ: 'ౠ',
  ऌ: 'ఌ',
  ए: 'ఏ',
  ऐ: 'ఐ',
  ओ: 'ఓ',
  औ: 'ఔ',
};

const vowelSigns = {
  'ा': 'ా',
  'ि': 'ి',
  'ी': 'ీ',
  'ु': 'ు',
  'ू': 'ూ',
  'ृ': 'ృ',
  'ॄ': 'ౄ',
  'ॢ': 'ౢ',
  'े': 'ే',
  'ै': 'ై',
  'ो': 'ో',
  'ौ': 'ౌ',
};

const consonants = {
  क: 'క',
  ख: 'ఖ',
  ग: 'గ',
  घ: 'ఘ',
  ङ: 'ఙ',
  च: 'చ',
  छ: 'ఛ',
  ज: 'జ',
  झ: 'ఝ',
  ञ: 'ఞ',
  ट: 'ట',
  ठ: 'ఠ',
  ड: 'డ',
  ढ: 'ఢ',
  ण: 'ణ',
  त: 'త',
  थ: 'థ',
  द: 'ద',
  ध: 'ధ',
  न: 'న',
  प: 'ప',
  फ: 'ఫ',
  ब: 'బ',
  भ: 'భ',
  म: 'మ',
  य: 'య',
  र: 'ర',
  ल: 'ల',
  व: 'వ',
  श: 'శ',
  ष: 'ష',
  स: 'స',
  ह: 'హ',
  ळ: 'ళ',
  क्ष: 'క్ష',
  ज्ञ: 'జ్ఞ',
};

const misc = {
  'ं': 'ం',
  'ः': 'ః',
  'ँ': 'ఁ',
  'ॐ': 'ఓం',
  '।': '।',
  '॥': '॥',
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
};

function transliterateToTelugu(text) {
  let output = '';

  for (let index = 0; index < text.length; index += 1) {
    const pair = text.slice(index, index + 2);
    if (pair === 'क्ष' || pair === 'ज्ञ') {
      output += consonants[pair];
      index += 1;
      continue;
    }

    const char = text[index];
    const next = text[index + 1];

    if (independentVowels[char]) {
      output += independentVowels[char];
      continue;
    }

    if (consonants[char]) {
      output += consonants[char];
      if (next === '्') {
        output += '్';
        index += 1;
        continue;
      }
      if (vowelSigns[next]) {
        output += vowelSigns[next];
        index += 1;
        continue;
      }
      continue;
    }

    if (vowelSigns[char]) {
      output += vowelSigns[char];
      continue;
    }

    if (misc[char]) {
      output += misc[char];
      continue;
    }

    output += char;
  }

  return output;
}

async function translateBatch(lines) {
  const joined = lines.join('\n[[BG_SPLIT]]\n');
  const response = await fetch(`${TRANSLATE_ENDPOINT}${encodeURIComponent(joined)}`);
  if (!response.ok) {
    throw new Error(`Translation request failed with ${response.status}`);
  }

  const payload = await response.json();
  const translated = payload[0].map((part) => part[0]).join('');
  return translated.split('\n[[BG_SPLIT]]\n');
}

async function translateAll(items) {
  const results = [];
  const chunkSize = 20;

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    const translated = await translateBatch(chunk);
    results.push(...translated);
    process.stdout.write(`Translated ${Math.min(index + chunk.length, items.length)}/${items.length}\r`);
  }

  process.stdout.write('\n');
  return results;
}

const chapterFiles = readdirSync(CHAPTER_DIR)
  .filter((file) => file.startsWith('chapter-') && file.endsWith('.json'))
  .sort();

for (const file of chapterFiles) {
  const path = `${CHAPTER_DIR}/${file}`;
  const chapter = JSON.parse(readFileSync(path, 'utf8'));

  const meaningSource = chapter.verses.map((verse) => verse.meaning.trim());
  const wordMeaningSource = chapter.verses.map((verse) => verse.wordMeanings.trim());

  const teluguMeanings = await translateAll(meaningSource);
  const teluguWordMeanings = await translateAll(wordMeaningSource);

  chapter.verses = chapter.verses.map((verse, index) => ({
    ...verse,
    teluguText: transliterateToTelugu(verse.text),
    teluguMeaning: teluguMeanings[index],
    teluguWordMeanings: teluguWordMeanings[index],
  }));

  writeFileSync(path, JSON.stringify(chapter, null, 2));
  console.log(`Updated ${file}`);
}
