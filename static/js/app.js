const topicSelect = document.querySelector("#topic-select");
const storyTitle = document.querySelector("#story-title");
const storyColumns = document.querySelector("#story-columns");
const wordList = document.querySelector("#word-list");
const wordPopover = document.querySelector("#word-popover");
const storySearch = document.querySelector("#story-search");
const levelFilter = document.querySelector("#level-filter");
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

let stories = [];
let extraWordExamples = {};
let currentTopic = "true crime";
let currentIndex = 0;
let translationsVisible = true;
let listVisible = false;
let textSizeIndex = 1;
const openedStories = new Set();
const clickedWords = new Set();
const dictionaryEntries = new Map();
const manuallyReadStories = new Set();
const favoriteStories = new Set();
const textSizes = ["0.92rem", "1rem", "1.12rem", "1.24rem"];

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
  listVisible = visible;
  storyListPanel.hidden = !visible;
  dictionaryPanel.hidden = true;
  toggleStoryListButton.textContent = visible ? "Terug naar verhaal" : "Alle verhalen";
  storyViewElements.forEach((element) => {
    element.hidden = visible;
  });

  hideWordPopover();

  if (visible) {
    renderStoryList();
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
  currentTopic = topic;
  const topicStories = storiesForTopic(currentTopic);
  currentIndex = todayStoryIndex(topicStories);
  setListVisible(false);
  renderStory();
}

function openDictionary() {
  const willOpen = dictionaryPanel.hidden;
  dictionaryPanel.hidden = !willOpen;
  storyListPanel.hidden = true;
  listVisible = false;
  toggleStoryListButton.textContent = "Alle verhalen";
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
  setTopic(currentTopic);
}

topicSelect.addEventListener("change", () => {
  setTopic(topicSelect.value);
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

toggleStoryListButton.addEventListener("click", () => {
  setListVisible(!listVisible);
});

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
