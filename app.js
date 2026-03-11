const sidebarEl = document.getElementById('sidebar');
const chapterTitleEl = document.getElementById('chapterTitle');
const chapterSummaryEl = document.getElementById('chapterSummary');
const chapterMetaEl = document.getElementById('chapterMeta');
const chapterImageEl = document.getElementById('chapterImage');
const verseNavEl = document.getElementById('verseNav');
const chapterNavEl = document.getElementById('chapterNav');
const verseLocationEl = document.getElementById('verseLocation');
const verseTextEl = document.getElementById('verseText');
const transliterationEl = document.getElementById('transliteration');
const verseMeaningEl = document.getElementById('verseMeaning');
const wordMeaningsEl = document.getElementById('wordMeanings');
const jumpGridEl = document.getElementById('jumpGrid');
const jumpLabelEl = document.getElementById('jumpLabel');
const prevVerseBtn = document.getElementById('prevVerse');
const nextVerseBtn = document.getElementById('nextVerse');
const audioTitleEl = document.getElementById('audioTitle');
const playPauseBtn = document.getElementById('playPause');
const seekBarEl = document.getElementById('seekBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const chapterAudioEl = document.getElementById('chapterAudio');
const ambienceAudioEl = document.getElementById('ambienceAudio');
const ambienceToggleEl = document.getElementById('ambienceToggle');

const chapterCache = new Map();
let manifest;
let currentChapter;
let ambienceOn = false;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function parseHash() {
  const cleaned = window.location.hash.replace(/^#\/?/, '');
  const [chapter, verse] = cleaned.split('/');
  return {
    chapter: chapter ? Number(chapter) : null,
    verse: verse ? Number(verse) : null,
  };
}

function setHash(chapter, verse) {
  window.location.hash = `/${chapter}/${verse}`;
}

async function loadManifest() {
  const response = await fetch('data/manifest.json');
  if (!response.ok) throw new Error('Unable to load manifest');
  manifest = await response.json();
}

async function loadChapter(path) {
  if (chapterCache.has(path)) return chapterCache.get(path);
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  const data = await response.json();
  chapterCache.set(path, data);
  return data;
}

function renderSidebar(activeChapter) {
  sidebarEl.innerHTML = `
    <h2 class="sidebar-title">Bhagavad Gita</h2>
    <p class="sidebar-subtitle">18 chapters, one shloka per page, chapter recitations, and quick access to every verse.</p>
    <div class="chapter-list">
      ${manifest.chapters
        .map(
          (chapter) => `
            <button
              class="chapter-button ${chapter.chapterNumber === activeChapter ? 'active' : ''}"
              type="button"
              data-chapter="${chapter.chapterNumber}"
            >
              <strong>Chapter ${chapter.chapterNumber}</strong>
              <span>${chapter.nameTranslation}</span>
            </button>
          `
        )
        .join('')}
    </div>
  `;

  sidebarEl.querySelectorAll('[data-chapter]').forEach((button) => {
    button.addEventListener('click', () => {
      const chapterNumber = Number(button.dataset.chapter);
      const chapter = manifest.chapters.find((entry) => entry.chapterNumber === chapterNumber);
      setHash(chapter.chapterNumber, 1);
    });
  });
}

function buildRailLink(chapterNumber, verseNumber, label, isActive = false) {
  return `<a class="rail-link ${isActive ? 'active' : ''}" href="#/${chapterNumber}/${verseNumber}">${label}</a>`;
}

function renderChapterHeader(chapterData, verse) {
  chapterTitleEl.textContent = chapterData.nameTranslation;
  chapterSummaryEl.textContent = chapterData.summary;
  chapterImageEl.src = chapterData.image;
  chapterImageEl.alt = `${chapterData.nameTranslation} artwork`;
  chapterMetaEl.innerHTML = `
    <span>Chapter ${chapterData.chapterNumber}</span>
    <span>${chapterData.verses.length} verses</span>
    <span>${chapterData.nameMeaning}</span>
  `;
  verseLocationEl.textContent = `Chapter ${chapterData.chapterNumber} • Verse ${verse.verseNumber}`;
  audioTitleEl.textContent = `Chapter ${chapterData.chapterNumber} Recitation`;
}

function renderNav(chapterData, verse) {
  const chapterIndex = manifest.chapters.findIndex(
    (entry) => entry.chapterNumber === chapterData.chapterNumber
  );
  const prevChapter = manifest.chapters[chapterIndex - 1];
  const nextChapter = manifest.chapters[chapterIndex + 1];

  const currentIndex = chapterData.verses.findIndex((entry) => entry.verseNumber === verse.verseNumber);
  const prevVerse = chapterData.verses[currentIndex - 1];
  const nextVerse = chapterData.verses[currentIndex + 1];

  verseNavEl.innerHTML = `
    ${prevVerse ? buildRailLink(chapterData.chapterNumber, prevVerse.verseNumber, 'Previous Verse') : ''}
    <span class="chapter-chip">Verse ${verse.verseNumber} of ${chapterData.verses.length}</span>
    ${nextVerse ? buildRailLink(chapterData.chapterNumber, nextVerse.verseNumber, 'Next Verse') : ''}
  `;

  chapterNavEl.innerHTML = `
    ${prevChapter ? buildRailLink(prevChapter.chapterNumber, 1, 'Previous Chapter') : ''}
    ${nextChapter ? buildRailLink(nextChapter.chapterNumber, 1, 'Next Chapter') : ''}
  `;

  prevVerseBtn.disabled = !prevVerse;
  nextVerseBtn.disabled = !nextVerse;
  prevVerseBtn.onclick = () => prevVerse && setHash(chapterData.chapterNumber, prevVerse.verseNumber);
  nextVerseBtn.onclick = () => nextVerse && setHash(chapterData.chapterNumber, nextVerse.verseNumber);
}

function renderVerse(chapterData, verse) {
  verseTextEl.textContent = verse.text;
  transliterationEl.textContent = verse.transliteration;
  verseMeaningEl.textContent = verse.meaning;
  wordMeaningsEl.textContent = verse.wordMeanings;
  jumpLabelEl.textContent = `${chapterData.verses.length} verses in this chapter`;

  jumpGridEl.innerHTML = chapterData.verses
    .map(
      (item) => `
        <a
          class="jump-link ${item.verseNumber === verse.verseNumber ? 'active' : ''}"
          href="#/${chapterData.chapterNumber}/${item.verseNumber}"
          title="Verse ${item.verseNumber}"
        >
          ${item.verseNumber}
        </a>
      `
    )
    .join('');
}

function syncAudio(chapterData) {
  if (chapterAudioEl.dataset.chapter === String(chapterData.chapterNumber)) return;

  chapterAudioEl.src = chapterData.audio;
  chapterAudioEl.dataset.chapter = String(chapterData.chapterNumber);
  chapterAudioEl.load();
  currentTimeEl.textContent = '0:00';
  durationEl.textContent = '0:00';
  seekBarEl.value = '0';
}

function updatePlayButton() {
  playPauseBtn.setAttribute(
    'aria-label',
    chapterAudioEl.paused ? 'Play chapter audio' : 'Pause chapter audio'
  );
  playPauseBtn.classList.toggle('is-playing', !chapterAudioEl.paused);
}

async function renderRoute() {
  const route = parseHash();
  const chapterEntry =
    manifest.chapters.find((entry) => entry.chapterNumber === route.chapter) || manifest.chapters[0];
  const chapterData = await loadChapter(chapterEntry.path);
  const verse =
    chapterData.verses.find((entry) => entry.verseNumber === route.verse) || chapterData.verses[0];

  if (route.chapter !== chapterData.chapterNumber || route.verse !== verse.verseNumber) {
    setHash(chapterData.chapterNumber, verse.verseNumber);
    return;
  }

  currentChapter = chapterData;
  renderSidebar(chapterData.chapterNumber);
  renderChapterHeader(chapterData, verse);
  renderNav(chapterData, verse);
  renderVerse(chapterData, verse);
  syncAudio(chapterData);
}

function installAudioEvents() {
  playPauseBtn.addEventListener('click', async () => {
    if (chapterAudioEl.paused) {
      await chapterAudioEl.play();
    } else {
      chapterAudioEl.pause();
    }
    updatePlayButton();
  });

  chapterAudioEl.addEventListener('play', updatePlayButton);
  chapterAudioEl.addEventListener('pause', updatePlayButton);
  chapterAudioEl.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(chapterAudioEl.duration);
  });

  chapterAudioEl.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatTime(chapterAudioEl.currentTime);
    const progress = chapterAudioEl.duration
      ? (chapterAudioEl.currentTime / chapterAudioEl.duration) * 100
      : 0;
    seekBarEl.value = String(progress);
  });

  seekBarEl.addEventListener('input', () => {
    if (!chapterAudioEl.duration) return;
    chapterAudioEl.currentTime = (Number(seekBarEl.value) / 100) * chapterAudioEl.duration;
  });

  ambienceToggleEl.addEventListener('click', async () => {
    ambienceOn = !ambienceOn;
    if (ambienceOn) {
      ambienceAudioEl.volume = 0.35;
      await ambienceAudioEl.play();
      ambienceToggleEl.textContent = 'Ambience On';
      return;
    }

    ambienceAudioEl.pause();
    ambienceToggleEl.textContent = 'Ambience Off';
  });
}

function installKeyboardNav() {
  window.addEventListener('keydown', (event) => {
    if (!currentChapter) return;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;

    const { verse } = parseHash();
    const currentIndex = currentChapter.verses.findIndex((entry) => entry.verseNumber === verse);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowRight' && currentChapter.verses[currentIndex + 1]) {
      event.preventDefault();
      setHash(currentChapter.chapterNumber, currentChapter.verses[currentIndex + 1].verseNumber);
    }

    if (event.key === 'ArrowLeft' && currentChapter.verses[currentIndex - 1]) {
      event.preventDefault();
      setHash(currentChapter.chapterNumber, currentChapter.verses[currentIndex - 1].verseNumber);
    }
  });
}

async function init() {
  await loadManifest();
  installAudioEvents();
  installKeyboardNav();
  window.addEventListener('hashchange', renderRoute);
  await renderRoute();
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding: 24px; color: white;">${error.message}</pre>`;
});
