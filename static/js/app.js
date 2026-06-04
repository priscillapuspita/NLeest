const topicSelect = document.querySelector("#topic-select");
const landingPage = document.querySelector("#landing-page");
const heroTrack = document.querySelector("#hero-track");
const heroDots = document.querySelector("#hero-dots");
const genreShelves = document.querySelector("#genre-shelves");
const genreNavButtons = [...document.querySelectorAll("[data-topic-nav]")];
const homeButton = document.querySelector("#home-button");
const backHomeButton = document.querySelector("#back-home");
const storyTitle = document.querySelector("#story-title");
const storyColumns = document.querySelector("#story-columns");
const wordList = document.querySelector("#word-list");
const wordPopover = document.querySelector("#word-popover");
const storySearch = document.querySelector("#story-search");
const levelFilter = document.querySelector("#level-filter");
const sessionStats = document.querySelector(".session-stats");
const organizePanel = document.querySelector(".organize-panel");
const dictionaryToggle = document.querySelector("#dictionary-toggle");
const dictionaryPanel = document.querySelector("#dictionary-panel");
const dictionaryCount = document.querySelector("#dictionary-count");
const dictionaryGrid = document.querySelector("#dictionary-grid");
const readingTime = document.querySelector("#reading-time");
const storyLevel = document.querySelector("#story-level");
const readingProgressText = document.querySelector("#reading-progress-text");
const readingProgressFill = document.querySelector("#reading-progress-fill");
const toggleTranslationButton = document.querySelector("#toggle-translation");
const toggleStoryListButton = document.querySelector("#toggle-story-list");
const landingLevelFilter = document.querySelector("#landing-level-filter");
const themeToggleButton = document.querySelector("#theme-toggle");
const decreaseTextButton = document.querySelector("#decrease-text");
const increaseTextButton = document.querySelector("#increase-text");
const storyListPanel = document.querySelector("#story-list-panel");
const storyCardGrid = document.querySelector("#story-card-grid");
const previousStoryButton = document.querySelector("#previous-story");
const nextStoryButton = document.querySelector("#next-story");
const markReadButton = document.querySelector("#mark-read");
const favoriteStoryButton = document.querySelector("#favorite-story");
const storiesReadCount = document.querySelector("#stories-read");
const wordsClickedCount = document.querySelector("#words-clicked");
const storyViewElements = [
  document.querySelector(".story-toolbar"),
  document.querySelector(".reading-progress"),
  storyColumns,
  document.querySelector(".vocabulary-panel"),
  document.querySelector(".story-navigation"),
];
const readerShellElements = [sessionStats, organizePanel, ...storyViewElements];

let stories = [];
let extraWordExamples = {};
let currentTopic = "nieuws";
let currentIndex = 0;
let translationsVisible = true;
let listVisible = false;
let landingVisible = true;
let textSizeIndex = 1;
const openedStories = new Set();
const clickedWords = new Set();
const dictionaryEntries = new Map();
const manuallyReadStories = new Set();
const favoriteStories = new Set();
const textSizes = ["0.92rem", "1rem", "1.12rem", "1.24rem"];
const topicOrder = ["nieuws", "true crime", "entertainment", "fictie"];
const topicLabels = {
  "nieuws": "Nieuws",
  "true crime": "True crime",
  "entertainment": "Entertainment",
  "fictie": "Fictie",
};

function storyMatchesLandingLevel(story) {
  const selectedLevel = landingLevelFilter.value;
  const storyLevelValue = story.level || "B1";
  return selectedLevel === "all" || storyLevelValue === selectedLevel;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleButton.textContent = theme === "dark" ? "Licht" : "Donker";
  sessionStorage.setItem("reader-theme", theme);
}

function applyTextSize() {
  document.documentElement.style.setProperty("--story-font-size", textSizes[textSizeIndex]);
  decreaseTextButton.disabled = textSizeIndex === 0;
  increaseTextButton.disabled = textSizeIndex === textSizes.length - 1;
  sessionStorage.setItem("reader-text-size", String(textSizeIndex));
}

function loadReaderPreferences() {
  const savedTheme = sessionStorage.getItem("reader-theme") || "dark";
  const savedTextSize = Number(sessionStorage.getItem("reader-text-size"));
  textSizeIndex = Number.isInteger(savedTextSize) && savedTextSize >= 0 && savedTextSize < textSizes.length ? savedTextSize : 1;
  applyTheme(savedTheme === "light" ? "light" : "dark");
  applyTextSize();
}

function loadSessionSet(key, targetSet) {
  try {
    JSON.parse(sessionStorage.getItem(key) || "[]").forEach((item) => targetSet.add(item));
  } catch {
    targetSet.clear();
  }
}

function saveSessionSet(key, sourceSet) {
  sessionStorage.setItem(key, JSON.stringify([...sourceSet]));
}

function loadSessionState() {
  loadSessionSet("reader-read-stories", manuallyReadStories);
  loadSessionSet("reader-favorite-stories", favoriteStories);

  try {
    const savedWords = JSON.parse(sessionStorage.getItem("reader-dictionary") || "[]");
    savedWords.forEach((entry) => {
      if (entry?.key) {
        dictionaryEntries.set(entry.key, entry);
      }
    });
  } catch {
    dictionaryEntries.clear();
  }
}

function saveDictionary() {
  sessionStorage.setItem("reader-dictionary", JSON.stringify([...dictionaryEntries.values()]));
}

function storiesForTopic(topic) {
  return stories.filter((story) => story.topic === topic);
}

function topicLabel(topic) {
  return topicLabels[topic] || topic;
}

function storyMatchesSearch(story, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    story.title,
    ...story.dutch_sentences,
    ...story.english_sentences,
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function filteredStoriesForCurrentTopic() {
  const query = storySearch.value.trim().toLowerCase();
  const selectedLevel = levelFilter.value;
  return storiesForTopic(currentTopic).filter((story) => {
    const level = story.level || "B1";
    return (selectedLevel === "all" || level === selectedLevel) && storyMatchesSearch(story, query);
  });
}

function currentStory() {
  return storiesForTopic(currentTopic)[currentIndex];
}

function setActiveTopic(topic) {
  currentTopic = topic;
  topicSelect.value = topic;
  genreNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.topicNav === topic);
  });
}

function todayStoryIndex(topicStories) {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return dayOfYear % topicStories.length;
}

function updateStats() {
  storiesReadCount.textContent = String(openedStories.size);
  wordsClickedCount.textContent = String(dictionaryEntries.size);
  dictionaryToggle.textContent = `Mijn woordenboek (${dictionaryEntries.size})`;
}

function hideWordPopover() {
  wordPopover.hidden = true;
  wordPopover.replaceChildren();
}

function estimateReadingMinutes(story) {
  const wordCount = story.dutch_sentences.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 15 / 60));
}

function storyMetaText(story) {
  return `${estimateReadingMinutes(story)} min lezen`;
}

function setReaderShellVisible(visible) {
  readerShellElements.forEach((element) => {
    element.hidden = !visible;
  });
}

function showLandingPage() {
  landingVisible = true;
  landingPage.hidden = false;
  storyListPanel.hidden = true;
  dictionaryPanel.hidden = true;
  listVisible = false;
  if (toggleStoryListButton) {
    toggleStoryListButton.textContent = "Alle verhalen";
  }
  setReaderShellVisible(false);
  hideWordPopover();
  renderLanding();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReaderPage() {
  landingVisible = false;
  landingPage.hidden = true;
  setReaderShellVisible(true);
}

function openStoryById(storyId) {
  const story = stories.find((candidate) => candidate.id === storyId);
  if (!story) {
    return;
  }

  setActiveTopic(story.topic);
  currentIndex = storiesForTopic(story.topic).findIndex((candidate) => candidate.id === storyId);
  storySearch.value = "";
  levelFilter.value = "all";
  showReaderPage();
  storyListPanel.hidden = true;
  dictionaryPanel.hidden = true;
  listVisible = false;
  if (toggleStoryListButton) {
    toggleStoryListButton.textContent = "Alle verhalen";
  }
  renderStory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showGenreOverview(topic) {
  setActiveTopic(topic);
  storySearch.value = "";
  levelFilter.value = "all";
  showReaderPage();
  setListVisible(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateReadingProgress() {
  const rows = [...document.querySelectorAll(".sentence-row")];
  if (rows.length === 0) {
    readingProgressText.textContent = "zin 0 / 0";
    readingProgressFill.style.width = "0%";
    return;
  }

  const viewportMiddle = window.innerHeight * 0.45;
  let activeIndex = 0;

  rows.forEach((row, index) => {
    if (row.getBoundingClientRect().top <= viewportMiddle) {
      activeIndex = index;
    }
  });

  const currentSentence = Math.min(activeIndex + 1, rows.length);
  const progress = (currentSentence / rows.length) * 100;
  readingProgressText.textContent = `zin ${currentSentence} / ${rows.length}`;
  readingProgressFill.style.width = `${progress}%`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function showWordPopover(entry, trigger) {
  const key = `${entry.article || ""}-${entry.word}`.toLowerCase();
  wordPopover.replaceChildren();

  const word = document.createElement("strong");
  const article = entry.article ? `${entry.article} ` : "";
  word.textContent = `${article}${entry.word}`;

  const translation = document.createElement("span");
  translation.textContent = entry.translation;

  const action = document.createElement("button");
  action.className = "popover-action";
  action.type = "button";

  if (dictionaryEntries.has(key)) {
    action.textContent = "Verwijderen uit woordenboek";
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      dictionaryEntries.delete(key);
      saveDictionary();
      updateStats();
      if (!dictionaryPanel.hidden) {
        renderDictionary();
      }
      showWordPopover(entry, trigger);
    });
  } else {
    action.textContent = "Toevoegen aan woordenboek";
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      dictionaryEntries.set(key, {
        key,
        word: entry.word,
        article: entry.article || "",
        translation: entry.translation,
      });
      saveDictionary();
      updateStats();
      if (!dictionaryPanel.hidden) {
        renderDictionary();
      }
      showWordPopover(entry, trigger);
    });
  }

  wordPopover.append(word, translation, action);
  wordPopover.hidden = false;

  const rect = trigger.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - 294);
  wordPopover.style.top = `${top}px`;
  wordPopover.style.left = `${Math.max(14, left)}px`;
}

function wordPattern(word) {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
}

function findExampleSentences(entry) {
  const pattern = wordPattern(entry.word);
  const examples = [];
  const usedSentences = new Set();

  function addExample(dutch, english, title = "") {
    const normalizedDutch = dutch.trim().toLowerCase();
    if (!normalizedDutch || usedSentences.has(normalizedDutch)) {
      return;
    }

    usedSentences.add(normalizedDutch);
    examples.push({ dutch, english, title });
  }

  stories.forEach((story) => {
    story.dutch_sentences.forEach((sentence, index) => {
      if (pattern.test(sentence)) {
        addExample(sentence, story.english_sentences[index] || "", story.title);
      }
    });
  });

  const extraKey = entry.word.toLowerCase();
  const matchingExtraKey = Object.keys(extraWordExamples).find((key) => key.toLowerCase() === extraKey);
  const extraExamples = matchingExtraKey ? extraWordExamples[matchingExtraKey] : [];
  extraExamples.forEach((example) => {
    if (example?.nl) {
      addExample(example.nl, example.en || "");
    }
  });

  return examples;
}

function appendMarkedExample(container, sentence, word) {
  const pattern = new RegExp(`\\b(${escapeRegExp(word)})\\b`, "ig");
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(sentence)) !== null) {
    if (match.index > lastIndex) {
      container.append(document.createTextNode(sentence.slice(lastIndex, match.index)));
    }

    const mark = document.createElement("mark");
    mark.textContent = match[0];
    container.append(mark);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < sentence.length) {
    container.append(document.createTextNode(sentence.slice(lastIndex)));
  }
}

function createMetaPills(story) {
  const meta = document.createElement("div");
  meta.className = "landing-card-meta";

  const time = document.createElement("span");
  time.textContent = storyMetaText(story);

  const level = document.createElement("span");
  level.textContent = story.level || "B1";

  meta.append(time, level);
  return meta;
}

function renderHero() {
  const newsStories = storiesForTopic("nieuws").filter(storyMatchesLandingLevel);
  heroTrack.replaceChildren();
  heroDots.replaceChildren();

  if (newsStories.length === 0) {
    const empty = document.createElement("article");
    empty.className = "hero-slide hero-slide-empty";

    const content = document.createElement("div");
    content.className = "hero-content";

    const label = document.createElement("span");
    label.className = "genre-label";
    label.textContent = "NIEUWS";

    const title = document.createElement("h3");
    title.textContent = "Geen verhalen op dit niveau";

    const intro = document.createElement("p");
    intro.className = "hero-intro";
    intro.textContent = "Kies een ander niveau om weer uitgelichte verhalen te zien.";

    content.append(label, title, intro);
    empty.append(content);
    heroTrack.append(empty);
    return;
  }

  newsStories.forEach((story, index) => {
    const slide = document.createElement("article");
    slide.className = "hero-slide";
    slide.id = `hero-slide-${story.id}`;

    const label = document.createElement("span");
    label.className = "genre-label";
    label.textContent = topicLabel(story.topic);

    const title = document.createElement("h3");
    title.textContent = story.title;

    const intro = document.createElement("p");
    intro.className = "hero-intro";
    intro.textContent = story.dutch_sentences[0] || "";

    const meta = createMetaPills(story);
    meta.className = "hero-meta";

    const actions = document.createElement("div");
    actions.className = "hero-actions";

    const readButton = document.createElement("button");
    readButton.className = "primary-button";
    readButton.type = "button";
    readButton.textContent = "Lees verder";
    readButton.addEventListener("click", () => openStoryById(story.id));

    actions.append(readButton);

    const content = document.createElement("div");
    content.className = "hero-content";
    content.append(label, title, intro, meta, actions);

    const visual = document.createElement("div");
    visual.className = "hero-visual";
    visual.setAttribute("aria-hidden", "true");

    const icon = document.createElement("div");
    icon.className = "hero-icon";
    icon.textContent = "N";

    visual.append(icon);
    slide.append(content, visual);
    heroTrack.append(slide);

    const dot = document.createElement("button");
    dot.className = "hero-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Ga naar ${story.title}`);
    dot.classList.toggle("is-active", index === 0);
    dot.addEventListener("click", () => {
      slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    });
    heroDots.append(dot);
  });
}

function renderGenreShelves() {
  genreShelves.replaceChildren();

  topicOrder.forEach((topic) => {
    const topicStories = storiesForTopic(topic).filter(storyMatchesLandingLevel);
    const shelf = document.createElement("section");
    shelf.className = "genre-shelf";
    shelf.setAttribute("aria-label", topicLabel(topic));

    const header = document.createElement("div");
    header.className = "genre-shelf-header";

    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = topic === "nieuws" ? "Hoofdgenre" : "Genre";

    const title = document.createElement("h2");
    title.className = "genre-shelf-title";
    title.textContent = topicLabel(topic);
    titleWrap.append(eyebrow, title);

    const allButton = document.createElement("button");
    allButton.className = "shelf-link";
    allButton.type = "button";
    allButton.textContent = "Alles bekijken";
    allButton.addEventListener("click", () => showGenreOverview(topic));

    header.append(titleWrap, allButton);

    const row = document.createElement("div");
    row.className = "landing-card-row";

    if (topicStories.length === 0) {
      const empty = document.createElement("p");
      empty.className = "landing-empty";
      empty.textContent = "Geen verhalen op dit niveau.";
      row.append(empty);
    }

    topicStories.forEach((story) => {
      const card = document.createElement("button");
      card.className = "landing-card";
      card.type = "button";
      card.addEventListener("click", () => openStoryById(story.id));

      const content = document.createElement("div");
      const label = document.createElement("span");
      label.className = "genre-label";
      label.textContent = topicLabel(story.topic);

      const cardTitle = document.createElement("h3");
      cardTitle.textContent = story.title;
      content.append(label, cardTitle);

      card.append(content, createMetaPills(story));
      row.append(card);
    });

    shelf.append(header, row);
    genreShelves.append(shelf);
  });
}

function renderLanding() {
  if (stories.length === 0) {
    return;
  }

  renderHero();
  renderGenreShelves();
}

function updateHeroDots() {
  const slides = [...heroTrack.querySelectorAll(".hero-slide")];
  const dots = [...heroDots.querySelectorAll(".hero-dot")];
  if (slides.length === 0) {
    return;
  }

  const activeIndex = slides.reduce((bestIndex, slide, index) => {
    const bestDistance = Math.abs(slides[bestIndex].offsetLeft - heroTrack.scrollLeft);
    const distance = Math.abs(slide.offsetLeft - heroTrack.scrollLeft);
    return distance < bestDistance ? index : bestIndex;
  }, 0);

  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeIndex);
  });
}

function renderDictionary() {
  dictionaryGrid.replaceChildren();
  dictionaryCount.textContent = `${dictionaryEntries.size} woorden verzameld`;

  if (dictionaryEntries.size === 0) {
    const empty = document.createElement("p");
    empty.className = "dictionary-empty";
    empty.textContent = "Klik op gemarkeerde woorden om je woordenboek te vullen.";
    dictionaryGrid.append(empty);
    return;
  }

  [...dictionaryEntries.values()].forEach((entry) => {
    const card = document.createElement("div");
    card.className = "dictionary-card";

    const word = document.createElement("strong");
    const article = entry.article ? `${entry.article} ` : "";
    word.textContent = `${article}${entry.word}`;

    const translation = document.createElement("span");
    translation.textContent = entry.translation;

    const removeButton = document.createElement("button");
    removeButton.className = "dictionary-remove";
    removeButton.type = "button";
    removeButton.textContent = "Verwijderen";
    removeButton.addEventListener("click", () => {
      dictionaryEntries.delete(entry.key);
      saveDictionary();
      updateStats();
      renderDictionary();
    });

    const examples = document.createElement("div");
    examples.className = "dictionary-examples";

    const exampleTitle = document.createElement("span");
    exampleTitle.className = "dictionary-example-title";
    exampleTitle.textContent = "Voorbeeldzinnen";
    examples.append(exampleTitle);

    const foundExamples = findExampleSentences(entry);
    if (foundExamples.length === 0) {
      const emptyExample = document.createElement("p");
      emptyExample.className = "dictionary-example-empty";
      emptyExample.textContent = "Nog geen voorbeeldzin gevonden.";
      examples.append(emptyExample);
    } else {
      foundExamples.forEach((example) => {
        const block = document.createElement("div");
        block.className = "dictionary-example";

        const dutch = document.createElement("p");
        dutch.className = "dictionary-example-dutch";
        appendMarkedExample(dutch, example.dutch, entry.word);

        const english = document.createElement("p");
        english.className = "dictionary-example-english";
        english.textContent = example.english;

        block.append(dutch, english);
        examples.append(block);
      });
    }

    card.append(word, translation, removeButton, examples);
    dictionaryGrid.append(card);
  });
}

function applyTranslationVisibility() {
  storyColumns.classList.toggle("translations-hidden", !translationsVisible);
  toggleTranslationButton.textContent = translationsVisible ? "Verberg vertaling" : "Toon vertaling";
}

function appendHighlightedDutchSentence(container, sentence, newWords) {
  const wordEntries = newWords
    .filter((entry) => entry.word)
    .sort((a, b) => b.word.length - a.word.length);

  if (wordEntries.length === 0) {
    container.textContent = sentence;
    return;
  }

  const pattern = new RegExp(`\\b(${wordEntries.map((entry) => escapeRegExp(entry.word)).join("|")})\\b`, "gi");
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(sentence)) !== null) {
    if (match.index > lastIndex) {
      container.append(document.createTextNode(sentence.slice(lastIndex, match.index)));
    }

    const entry = wordEntries.find((item) => item.word.toLowerCase() === match[0].toLowerCase());
    const button = document.createElement("button");
    button.className = "highlight-word";
    button.type = "button";
    button.textContent = match[0];
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      showWordPopover(entry, button);
    });
    container.append(button);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < sentence.length) {
    container.append(document.createTextNode(sentence.slice(lastIndex)));
  }
}

function renderStoryList() {
  const topicStories = filteredStoriesForCurrentTopic();
  storyCardGrid.replaceChildren();

  if (topicStories.length === 0) {
    const empty = document.createElement("p");
    empty.className = "dictionary-empty";
    empty.textContent = "Geen verhalen gevonden.";
    storyCardGrid.append(empty);
    return;
  }

  topicStories.forEach((story, index) => {
    const card = document.createElement("button");
    card.className = "story-card";
    card.type = "button";
    card.classList.toggle("is-active", story.id === currentStory()?.id);

    const title = document.createElement("strong");
    title.textContent = story.title;

    const meta = document.createElement("span");
    meta.textContent = `${story.dutch_sentences.length} zinnen`;

    const badges = document.createElement("div");
    badges.className = "story-card-badges";

    const levelBadge = document.createElement("span");
    levelBadge.className = "story-card-badge";
    levelBadge.textContent = story.level || "B1";
    badges.append(levelBadge);

    if (manuallyReadStories.has(story.id)) {
      const readBadge = document.createElement("span");
      readBadge.className = "story-card-badge is-read";
      readBadge.textContent = "Gelezen";
      badges.append(readBadge);
    }

    if (favoriteStories.has(story.id)) {
      const favoriteBadge = document.createElement("span");
      favoriteBadge.className = "story-card-badge is-favorite";
      favoriteBadge.textContent = "Favoriet";
      badges.append(favoriteBadge);
    }

    card.append(title, meta, badges);
    card.addEventListener("click", () => {
      currentIndex = storiesForTopic(currentTopic).findIndex((candidate) => candidate.id === story.id);
      setListVisible(false);
      renderStory();
    });

    storyCardGrid.append(card);
  });
}

function setListVisible(visible) {
  showReaderPage();
  listVisible = visible;
  storyListPanel.hidden = !visible;
  dictionaryPanel.hidden = true;
  if (toggleStoryListButton) {
    toggleStoryListButton.textContent = visible ? "Terug naar verhaal" : "Alle verhalen";
  }
  storyViewElements.forEach((element) => {
    element.hidden = visible;
  });

  hideWordPopover();

  if (visible) {
    renderStoryList();
  } else if (storyColumns.children.length === 0) {
    renderStory();
  }
}

function updateStoryActionButtons() {
  const story = currentStory();
  if (!story) {
    return;
  }

  const isRead = manuallyReadStories.has(story.id);
  const isFavorite = favoriteStories.has(story.id);
  markReadButton.textContent = isRead ? "Gelezen" : "Markeer als gelezen";
  markReadButton.classList.toggle("is-active", isRead);
  favoriteStoryButton.textContent = isFavorite ? "★" : "☆";
  favoriteStoryButton.classList.toggle("is-active", isFavorite);
}

function renderStory() {
  const story = currentStory();
  if (!story) {
    return;
  }

  openedStories.add(story.id);
  updateStats();
  storyTitle.textContent = story.title;
  readingTime.textContent = `${estimateReadingMinutes(story)} min lezen`;
  storyLevel.textContent = story.level || "B1";
  storyColumns.replaceChildren();
  wordList.replaceChildren();
  hideWordPopover();
  updateStoryActionButtons();

  story.dutch_sentences.forEach((sentence, index) => {
    const row = document.createElement("div");
    row.className = "sentence-row";

    const dutch = document.createElement("p");
    dutch.className = "sentence dutch";
    appendHighlightedDutchSentence(dutch, sentence, story.new_words);

    const english = document.createElement("p");
    english.className = "sentence english";
    english.textContent = story.english_sentences[index] || "";

    row.append(dutch, english);
    storyColumns.append(row);
  });

  story.new_words.forEach((entry) => {
    const card = document.createElement("button");
    card.className = "word-card";
    card.type = "button";

    const word = document.createElement("strong");
    const article = entry.article ? `${entry.article} ` : "";
    word.textContent = `${article}${entry.word}`;

    const translation = document.createElement("span");
    translation.textContent = entry.translation;

    card.append(word, translation);
    card.addEventListener("click", (event) => {
      event.stopPropagation();
      showWordPopover(entry, card);
    });
    wordList.append(card);
  });

  applyTranslationVisibility();
  window.requestAnimationFrame(updateReadingProgress);

  if (listVisible) {
    renderStoryList();
  }
}

function setTopic(topic) {
  setActiveTopic(topic);
  const topicStories = storiesForTopic(currentTopic);
  currentIndex = todayStoryIndex(topicStories);
  setListVisible(false);
  renderStory();
}

function openDictionary() {
  showReaderPage();
  const willOpen = dictionaryPanel.hidden;
  dictionaryPanel.hidden = !willOpen;
  storyListPanel.hidden = true;
  listVisible = false;
  if (toggleStoryListButton) {
    toggleStoryListButton.textContent = "Alle verhalen";
  }
  storyViewElements.forEach((element) => {
    element.hidden = willOpen;
  });
  hideWordPopover();

  if (willOpen) {
    renderDictionary();
  }
}

async function loadStories() {
  const [storiesResponse, examplesResponse] = await Promise.all([
    fetch("/api/stories"),
    fetch("/api/word-examples"),
  ]);
  const storiesData = await storiesResponse.json();
  const examplesData = await examplesResponse.json();
  stories = storiesData.stories;
  extraWordExamples = examplesData.examples || {};
  setActiveTopic(currentTopic);
  currentIndex = todayStoryIndex(storiesForTopic(currentTopic));
  showLandingPage();
}

topicSelect.addEventListener("change", () => {
  setTopic(topicSelect.value);
});

genreNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showGenreOverview(button.dataset.topicNav);
  });
});

homeButton.addEventListener("click", showLandingPage);
backHomeButton.addEventListener("click", showLandingPage);
heroTrack.addEventListener("scroll", updateHeroDots, { passive: true });
landingLevelFilter.addEventListener("change", () => {
  renderLanding();
});

storySearch.addEventListener("input", () => {
  if (!listVisible) {
    setListVisible(true);
  } else {
    renderStoryList();
  }
});

levelFilter.addEventListener("change", () => {
  if (!listVisible) {
    setListVisible(true);
  } else {
    renderStoryList();
  }
});

dictionaryToggle.addEventListener("click", openDictionary);

document.addEventListener("click", (event) => {
  if (!wordPopover.hidden && !wordPopover.contains(event.target)) {
    hideWordPopover();
  }
});

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress);

toggleTranslationButton.addEventListener("click", () => {
  translationsVisible = !translationsVisible;
  applyTranslationVisibility();
});

if (toggleStoryListButton) {
  toggleStoryListButton.addEventListener("click", () => {
    setListVisible(!listVisible);
  });
}

themeToggleButton.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

decreaseTextButton.addEventListener("click", () => {
  textSizeIndex = Math.max(0, textSizeIndex - 1);
  applyTextSize();
});

increaseTextButton.addEventListener("click", () => {
  textSizeIndex = Math.min(textSizes.length - 1, textSizeIndex + 1);
  applyTextSize();
});

previousStoryButton.addEventListener("click", () => {
  const topicStories = storiesForTopic(currentTopic);
  currentIndex = (currentIndex - 1 + topicStories.length) % topicStories.length;
  renderStory();
});

nextStoryButton.addEventListener("click", () => {
  const topicStories = storiesForTopic(currentTopic);
  currentIndex = (currentIndex + 1) % topicStories.length;
  renderStory();
});

loadReaderPreferences();
loadSessionState();
updateStats();
loadStories();

markReadButton.addEventListener("click", () => {
  const story = currentStory();
  if (!story) {
    return;
  }

  manuallyReadStories.add(story.id);
  saveSessionSet("reader-read-stories", manuallyReadStories);
  updateStoryActionButtons();
  if (listVisible) {
    renderStoryList();
  }
});

favoriteStoryButton.addEventListener("click", () => {
  const story = currentStory();
  if (!story) {
    return;
  }

  if (favoriteStories.has(story.id)) {
    favoriteStories.delete(story.id);
  } else {
    favoriteStories.add(story.id);
  }

  saveSessionSet("reader-favorite-stories", favoriteStories);
  updateStoryActionButtons();
  if (listVisible) {
    renderStoryList();
  }
});
