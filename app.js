const LANGUAGE = document.body.dataset.language;
const HEADER_IMAGE = 'assets/images/bg01.jpg';

async function initReader() {
  const ui = UI_COPY[LANGUAGE] || UI_COPY.en;
  const sidebarEl = document.getElementById('sidebar');
  const chapterTitleEl = document.getElementById('chapterTitle');
  const chapterSummaryEl = document.getElementById('chapterSummary');
  const chapterMetaEl = document.getElementById('chapterMeta');
  const chapterImageEl = document.getElementById('chapterImage');
  const verseNavEl = document.getElementById('verseNav');
  const chapterNavEl = document.getElementById('chapterNav');
  const verseLocationEl = document.getElementById('verseLocation');
  const transliterationEl = document.getElementById('transliteration');
  const verseTextEl = document.getElementById('verseText');
  const verseMeaningEl = document.getElementById('verseMeaning');
  const wordMeaningsEl = document.getElementById('wordMeanings');
  const jumpGridEl = document.getElementById('jumpGrid');
  const jumpLabelEl = document.getElementById('jumpLabel');
  const prevVerseBtn = document.getElementById('prevVerse');
  const nextVerseBtn = document.getElementById('nextVerse');
  const chapterAudioEl = document.getElementById('chapterAudio');
  const ambienceAudioEl = document.getElementById('ambienceAudio');
  const ambienceToggleEl = document.getElementById('ambienceToggle');
  const audioTitleEl = document.getElementById('audioTitle');
  const audioEyebrowEl = document.getElementById('audioEyebrow');
  const meaningHeadingEl = document.getElementById('meaningHeading');
  const wordMeaningLabelEl = document.getElementById('wordMeaningLabel');
  const jumpEyebrowEl = document.getElementById('jumpEyebrow');
  const jumpHeadingEl = document.getElementById('jumpHeading');

  const chapterCache = new Map();
  let manifest;
  let currentChapter;
  let ambienceOn = false;

  audioEyebrowEl.textContent = ui.audioEyebrow;
  meaningHeadingEl.textContent = ui.meaningHeading;
  wordMeaningLabelEl.textContent = ui.wordMeaningLabel;
  jumpEyebrowEl.textContent = ui.jumpEyebrow;
  jumpHeadingEl.textContent = ui.jumpHeading;

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
    manifest = await response.json();
  }

  async function loadChapter(path) {
    if (chapterCache.has(path)) return chapterCache.get(path);
    const response = await fetch(path);
    const data = await response.json();
    chapterCache.set(path, data);
    return data;
  }

  function chapterMetaFor(chapter) {
    if (LANGUAGE === 'te') {
      return TELUGU_CHAPTERS[chapter.chapterNumber];
    }

    return {
      title: chapter.nameTranslation,
      meaning: chapter.nameMeaning,
      summary: chapter.summary,
    };
  }

  function renderSidebar(activeChapter) {
    sidebarEl.innerHTML = `
      <h2 class="sidebar-title">${ui.sidebarTitle}</h2>
      <p class="sidebar-subtitle">${ui.sidebarSubtitle}</p>
      <div class="chapter-list">
        ${manifest.chapters
          .map((chapter) => {
            const meta = chapterMetaFor({
              chapterNumber: chapter.chapterNumber,
              nameTranslation: chapter.nameTranslation,
              nameMeaning: chapter.nameMeaning,
              summary: '',
            });

            return `
              <button
                class="chapter-button ${chapter.chapterNumber === activeChapter ? 'active' : ''}"
                type="button"
                data-chapter="${chapter.chapterNumber}"
              >
                <strong>${ui.chapterLabel} ${chapter.chapterNumber}</strong>
                <span>${meta.title}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    `;

    sidebarEl.querySelectorAll('[data-chapter]').forEach((button) => {
      button.addEventListener('click', () => setHash(Number(button.dataset.chapter), 1));
    });
  }

  function buildRailLink(chapterNumber, verseNumber, label, active = false) {
    return `<a class="rail-link ${active ? 'active' : ''}" href="#/${chapterNumber}/${verseNumber}">${label}</a>`;
  }

  function renderHeader(chapterData, verse) {
    const meta = chapterMetaFor(chapterData);

    chapterTitleEl.textContent = meta.title;
    chapterSummaryEl.textContent = meta.summary;
    chapterImageEl.src = HEADER_IMAGE;
    chapterMetaEl.innerHTML = `
      <span>${ui.chapterLabel} ${chapterData.chapterNumber}</span>
      <span>${chapterData.verses.length} ${ui.verseCountLabel}</span>
      <span>${meta.meaning}</span>
    `;
    verseLocationEl.textContent = `${ui.chapterLabel} ${chapterData.chapterNumber} • ${ui.verseLabel} ${verse.verseNumber}`;
    audioTitleEl.textContent = `${ui.chapterLabel} ${chapterData.chapterNumber} ${ui.audioTitleSuffix}`;
  }

  function renderNav(chapterData, verse) {
    const chapterIndex = manifest.chapters.findIndex((item) => item.chapterNumber === chapterData.chapterNumber);
    const prevChapter = manifest.chapters[chapterIndex - 1];
    const nextChapter = manifest.chapters[chapterIndex + 1];
    const currentIndex = chapterData.verses.findIndex((item) => item.verseNumber === verse.verseNumber);
    const prevVerse = chapterData.verses[currentIndex - 1];
    const nextVerse = chapterData.verses[currentIndex + 1];

    verseNavEl.innerHTML = `
      ${prevVerse ? buildRailLink(chapterData.chapterNumber, prevVerse.verseNumber, ui.prevVerse) : ''}
      <span class="chapter-chip">${ui.verseLabel} ${verse.verseNumber} / ${chapterData.verses.length}</span>
      ${nextVerse ? buildRailLink(chapterData.chapterNumber, nextVerse.verseNumber, ui.nextVerse) : ''}
    `;

    chapterNavEl.innerHTML = `
      ${prevChapter ? buildRailLink(prevChapter.chapterNumber, 1, ui.prevChapter) : ''}
      ${nextChapter ? buildRailLink(nextChapter.chapterNumber, 1, ui.nextChapter) : ''}
    `;

    prevVerseBtn.disabled = !prevVerse && !prevChapter;
    nextVerseBtn.disabled = !nextVerse && !nextChapter;
    prevVerseBtn.onclick = () => navigateRelative(-1);
    nextVerseBtn.onclick = () => navigateRelative(1);
  }

  function renderVerse(chapterData, verse) {
    verseTextEl.textContent = LANGUAGE === 'te' ? verse.teluguText || verse.text : verse.text;
    transliterationEl.textContent = verse.transliteration;
    verseMeaningEl.textContent =
      LANGUAGE === 'te' ? verse.teluguMeaning || verse.meaning : verse.meaning;
    wordMeaningsEl.textContent =
      LANGUAGE === 'te' ? verse.teluguWordMeanings || verse.wordMeanings : verse.wordMeanings;
    jumpLabelEl.textContent = `${chapterData.verses.length} ${ui.jumpCountSuffix}`;

    jumpGridEl.innerHTML = chapterData.verses
      .map(
        (item) => `
          <a
            class="jump-link ${item.verseNumber === verse.verseNumber ? 'active' : ''}"
            href="#/${chapterData.chapterNumber}/${item.verseNumber}"
            title="${ui.verseLabel} ${item.verseNumber}"
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
  }

  ambienceToggleEl.addEventListener('click', async () => {
    ambienceOn = !ambienceOn;
    if (ambienceOn) {
      ambienceAudioEl.volume = 0.35;
      await ambienceAudioEl.play();
      ambienceToggleEl.textContent = ui.ambienceOn;
      return;
    }

    ambienceAudioEl.pause();
    ambienceToggleEl.textContent = ui.ambienceOff;
  });

  async function renderRoute() {
    const route = parseHash();
    const chapterEntry =
      manifest.chapters.find((item) => item.chapterNumber === route.chapter) || manifest.chapters[0];
    const chapterData = await loadChapter(chapterEntry.path);
    const verse =
      chapterData.verses.find((item) => item.verseNumber === route.verse) || chapterData.verses[0];

    if (route.chapter !== chapterData.chapterNumber || route.verse !== verse.verseNumber) {
      setHash(chapterData.chapterNumber, verse.verseNumber);
      return;
    }

    currentChapter = chapterData;
    renderSidebar(chapterData.chapterNumber);
    renderHeader(chapterData, verse);
    renderNav(chapterData, verse);
    renderVerse(chapterData, verse);
    syncAudio(chapterData);
  }

  function navigateRelative(direction) {
    if (!currentChapter) return;

    const route = parseHash();
    const chapterIndex = manifest.chapters.findIndex(
      (item) => item.chapterNumber === currentChapter.chapterNumber
    );
    const currentIndex = currentChapter.verses.findIndex((item) => item.verseNumber === route.verse);
    if (currentIndex === -1 || chapterIndex === -1) return;

    const targetInChapter = currentChapter.verses[currentIndex + direction];
    if (targetInChapter) {
      setHash(currentChapter.chapterNumber, targetInChapter.verseNumber);
      return;
    }

    const nextChapterEntry = manifest.chapters[chapterIndex + direction];
    if (!nextChapterEntry) return;

    const targetVerse =
      direction > 0 ? 1 : nextChapterEntry.verseCount;

    setHash(nextChapterEntry.chapterNumber, targetVerse);
  }

  window.addEventListener('keydown', (event) => {
    if (!currentChapter) return;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateRelative(1);
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateRelative(-1);
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    'touchend',
    (event) => {
      if (!currentChapter) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 60 || Math.abs(deltaY) > 50) return;

      if (deltaX < 0) navigateRelative(1);
      if (deltaX > 0) navigateRelative(-1);
    },
    { passive: true }
  );

  await loadManifest();
  ambienceToggleEl.textContent = ui.ambienceOff;
  window.addEventListener('hashchange', renderRoute);
  await renderRoute();
}

const UI_COPY = {
  en: {
    sidebarTitle: 'Bhagavad Gita',
    sidebarSubtitle: '18 chapters, one shloka at a time, with chapter audio and direct verse jumping.',
    chapterLabel: 'Chapter',
    verseLabel: 'Verse',
    verseCountLabel: 'verses',
    prevVerse: 'Previous Verse',
    nextVerse: 'Next Verse',
    prevChapter: 'Previous Chapter',
    nextChapter: 'Next Chapter',
    audioEyebrow: 'Chapter Recitation',
    audioTitleSuffix: 'Recitation',
    meaningHeading: 'Meaning',
    wordMeaningLabel: 'Word-by-word meaning',
    jumpEyebrow: 'Jump To Any Shloka',
    jumpHeading: 'Verse Navigator',
    jumpCountSuffix: 'verses in this chapter',
    ambienceOn: 'Ambience On',
    ambienceOff: 'Ambience Off',
  },
  te: {
    sidebarTitle: 'భగవద్గీత',
    sidebarSubtitle: '18 అధ్యాయాలు, ఒక్కో శ్లోకంగా పఠనం, అధ్యాయ ఆడియో, మరియు నేరుగా శ్లోక సూచిక.',
    chapterLabel: 'అధ్యాయం',
    verseLabel: 'శ్లోకం',
    verseCountLabel: 'శ్లోకాలు',
    prevVerse: 'మునుపటి శ్లోకం',
    nextVerse: 'తర్వాతి శ్లోకం',
    prevChapter: 'మునుపటి అధ్యాయం',
    nextChapter: 'తర్వాతి అధ్యాయం',
    audioEyebrow: 'అధ్యాయ పారాయణం',
    audioTitleSuffix: 'పారాయణం',
    meaningHeading: 'అర్థం',
    wordMeaningLabel: 'పదార్థం',
    jumpEyebrow: 'ఏ శ్లోకానికైనా వెళ్లండి',
    jumpHeading: 'శ్లోక సూచిక',
    jumpCountSuffix: 'శ్లోకాలు ఈ అధ్యాయంలో ఉన్నాయి',
    ambienceOn: 'నేపథ్య ధ్వని ఆన్',
    ambienceOff: 'నేపథ్య ధ్వని ఆఫ్',
  },
};

const TELUGU_CHAPTERS = {
  1: {
    title: 'అర్జున విషాద యోగము',
    meaning: 'అర్జునుడి మోహం మరియు విషాదం',
    summary: 'కురుక్షేత్ర యుద్ధరంగంలో అర్జునుడు తన బంధువులను చూసి మనోవేదనకు లోనవుతాడు. ఆ దిగ్బ్రాంతి మధ్య శ్రీకృష్ణుని ఆశ్రయించడంతో గీతా బోధ ప్రారంభమవుతుంది.',
  },
  2: {
    title: 'సాంఖ్య యోగము',
    meaning: 'ఆత్మ తత్త్వ జ్ఞానం',
    summary: 'ఆత్మ నిత్యమైనది, శరీరం నశ్వరమైనది అని కృష్ణుడు వివరిస్తాడు. ఫలాపేక్ష లేకుండా కర్తవ్యాన్ని చేయాలని కర్మయోగానికి పునాది వేస్తాడు.',
  },
  3: {
    title: 'కర్మ యోగము',
    meaning: 'నిష్కామ కర్మ మార్గం',
    summary: 'చర్యల నుంచి పారిపోవడం కాదు, వాటిని యజ్ఞభావంతో చేయడం ముఖ్యం అని బోధిస్తుంది. సమాజ హితం కోసం స్వార్థరహిత కర్మ చేయాలి అని చెబుతుంది.',
  },
  4: {
    title: 'జ్ఞాన కర్మ సన్యాస యోగము',
    meaning: 'జ్ఞానం ద్వారా కర్మ శుద్ధి',
    summary: 'దివ్య అవతార రహస్యం, గురు మహత్వం, జ్ఞానయజ్ఞం ప్రాముఖ్యత ఈ అధ్యాయంలో చెప్పబడతాయి. జ్ఞానం కర్మలను పవిత్రం చేస్తుందని కృష్ణుడు బోధిస్తాడు.',
  },
  5: {
    title: 'కర్మ సన్యాస యోగము',
    meaning: 'త్యాగం మరియు కర్తవ్య సమన్వయం',
    summary: 'సన్యాసం మరియు కర్మయోగం రెండింటి తాత్పర్యాన్ని కృష్ణుడు పోలుస్తాడు. అంతరంగ వైరాగ్యంతో కర్తవ్యాన్ని చేయడం శ్రేష్ఠమని వివరిస్తాడు.',
  },
  6: {
    title: 'ధ్యాన యోగము',
    meaning: 'మనస్సు నియంత్రణ మరియు ధ్యానం',
    summary: 'ధ్యాన సాధనకు అవసరమైన స్థిరత్వం, నియమం, సమత్వం గురించి వివరించబడుతుంది. చంచలమైన మనస్సును అభ్యాసం మరియు వైరాగ్యంతో నియంత్రించాలి.',
  },
  7: {
    title: 'జ్ఞాన విజ్ఞాన యోగము',
    meaning: 'పరమాత్మ జ్ఞానం మరియు అనుభవం',
    summary: 'ప్రపంచమంతటా వ్యాపించి ఉన్న తన దివ్య స్వరూపాన్ని కృష్ణుడు తెలియజేస్తాడు. ఆయనను తెలుసుకోవడం జ్ఞానం అయితే, ఆయనను అనుభవించడం విజ్ఞానం.',
  },
  8: {
    title: 'అక్షర బ్రహ్మ యోగము',
    meaning: 'శాశ్వత బ్రహ్మ స్వరూపం',
    summary: 'మరణసమయంలో స్మరణ, పరమగతి, బ్రహ్మ తత్త్వం వంటి విషయాలు ఈ అధ్యాయంలో ఉంచబడ్డాయి. ఎప్పుడూ దైవస్మరణతో ఉండే జీవి ఉత్తమ గమ్యాన్ని చేరుతాడు.',
  },
  9: {
    title: 'రాజవిద్యా యోగము',
    meaning: 'గుహ్యమైన మహాజ్ఞానం',
    summary: 'భక్తితో కృష్ణుని ఆశ్రయించిన వారికి ఆయన ఎంత సులభంగా లభిస్తాడో ఈ అధ్యాయం చెబుతుంది. సమస్త జగత్తుకూ ఆధారమైన దైవ ప్రేమను ఇది ప్రతిపాదిస్తుంది.',
  },
  10: {
    title: 'విభూతి యోగము',
    meaning: 'దివ్య వైభవ పరిచయం',
    summary: 'సృష్టిలోని శ్రేష్ఠతలన్నీ కృష్ణుని కాంతి కణికలు అని ఈ అధ్యాయం బోధిస్తుంది. విశ్వంలోని మహిమల ద్వారా దైవాన్ని దర్శించమని సూచిస్తుంది.',
  },
  11: {
    title: 'విశ్వరూప దర్శన యోగము',
    meaning: 'కోస్మిక్ రూప దర్శనం',
    summary: 'అర్జునుడు కృష్ణుని విశ్వరూపాన్ని దర్శించి ఆశ్చర్యచకితుడవుతాడు. కాలస్వరూపుడైన దైవ మహిమను ప్రత్యక్షంగా అనుభవించే ఘట్టమిది.',
  },
  12: {
    title: 'భక్తి యోగము',
    meaning: 'అనన్య భక్తి మార్గం',
    summary: 'భక్తుడి లక్షణాలు, ప్రేమతో దైవాన్ని చేరుకునే సులభ మార్గం ఈ అధ్యాయపు హృదయం. స్థిరమైన మనస్సు, దయ, ద్వేషరాహిత్యం ప్రధాన గుణాలు.',
  },
  13: {
    title: 'క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగము',
    meaning: 'శరీరం మరియు ఆత్మ మధ్య భేదం',
    summary: 'శరీరాన్ని క్షేత్రంగా, ఆత్మను క్షేత్రజ్ఞుడిగా పేర్కొంటుంది. ప్రకృతి, పురుషుడు, జ్ఞానం, జ్ఞేయం గురించి ఈ అధ్యాయం సూటిగా బోధిస్తుంది.',
  },
  14: {
    title: 'గుణత్రయ విభాగ యోగము',
    meaning: 'సత్త్వ, రజస్, తమస్ స్వభావాలు',
    summary: 'మానవ జీవనాన్ని ప్రభావితం చేసే మూడు గుణాల స్వరూపం మరియు వాటి ప్రభావం వివరించబడుతుంది. గుణాతీత స్థితి వైపు మనసును తీసుకువెళ్తుంది.',
  },
  15: {
    title: 'పురుషోత్తమ యోగము',
    meaning: 'పరమ పురుషుని జ్ఞానం',
    summary: 'ఉర్ధ్వమూల అశ్వత్థ వృక్ష రూపకంతో సంసార స్వభావం చెప్పబడుతుంది. క్షర, అక్షర, పురుషోత్తమ తత్త్వాలను కృష్ణుడు వివరిస్తాడు.',
  },
  16: {
    title: 'దైవాసుర సంపద్విభాగ యోగము',
    meaning: 'దైవ గుణాలు మరియు అసుర గుణాలు',
    summary: 'మానవుడిని విముక్తి వైపు నడిపే దైవసంపత్తి, బంధనంలో పడేసే ఆసురస్వభావం మధ్య భేదం చూపుతుంది. ఆచరణలో ధర్మబలాన్ని పెంచే అధ్యాయం ఇది.',
  },
  17: {
    title: 'శ్రద్ధాత్రయ విభాగ యోగము',
    meaning: 'మూడు విధాల శ్రద్ధ',
    summary: 'మనిషి శ్రద్ధ, ఆహారం, యజ్ఞం, తపస్సు, దానం మూడు గుణాల ఆధారంగా ఎలా మారుతాయో వివరిస్తుంది. “ఓం తత్ సత్” మహత్త్వాన్ని తెలియజేస్తుంది.',
  },
  18: {
    title: 'మోక్ష సన్యాస యోగము',
    meaning: 'ముక్తి మరియు సమర్పణం',
    summary: 'సర్వధర్మాలను విడిచి దైవంలో శరణు పొందమనే గీతా మహావాక్యంతో ఈ అధ్యాయం ముగుస్తుంది. జ్ఞానం, కర్మ, భక్తి అన్నింటి సారాన్ని మోక్ష మార్గంగా సమన్వయిస్తుంది.',
  },
};

if (LANGUAGE) {
  initReader().catch((error) => {
    document.body.innerHTML = `<pre style="padding:24px;color:white;">${error.message}</pre>`;
  });
}
