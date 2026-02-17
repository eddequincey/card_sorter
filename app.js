const PET_TYPES = [
  "Dog",
  "Cat",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Parrot",
  "Goldfish",
  "Turtle",
  "Ferret",
  "Budgie",
  "Gecko",
  "Canary",
];

const STORAGE_KEY = "card-sorter-rounds";
const TUTORIAL_PREF_KEY = "card-sorter-hide-tutorial";
const PILE_WIDTH = 240;
const PILE_MARGIN = 12;
const PILE_GAP = 10;
const SNAP_STEP = 24;

const deckEl = document.getElementById("deck");
const deckCountEl = document.getElementById("deckCount");
const workspaceEl = document.getElementById("workspace");
const sortPanelEl = document.getElementById("sortPanel");
const stopMessageEl = document.getElementById("stopMessage");
const criterionPanel = document.getElementById("criterionPanel");
const roundCriterionInput = document.getElementById("roundCriterionInput");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const clearSortsBtn = document.getElementById("clearSortsBtn");
const roundCountEl = document.getElementById("roundCount");
const historyEl = document.getElementById("history");
const cardTemplate = document.getElementById("cardTemplate");
const tutorialDialog = document.getElementById("tutorialDialog");
const tutorialForm = document.getElementById("tutorialForm");
const tutorialDontShow = document.getElementById("tutorialDontShow");
const tutorialCriterionValue = document.getElementById("tutorialCriterionValue");
const tutorialPileNameA = document.getElementById("tutorialPileNameA");
const tutorialPileNameB = document.getElementById("tutorialPileNameB");
const tutorialStepAnchor = document.querySelector(".tutorial-step-1");
const finalizeDialog = document.getElementById("finalizeDialog");
const finalizeForm = document.getElementById("finalizeForm");
const finalizeCriterionInput = document.getElementById("finalizeCriterionInput");
const finalizePileNamesEl = document.getElementById("finalizePileNames");
const finalizeErrorEl = document.getElementById("finalizeError");
const cancelFinalizeBtn = document.getElementById("cancelFinalizeBtn");
const saveContinueBtn = document.getElementById("saveContinueBtn");
const saveStopBtn = document.getElementById("saveStopBtn");

let nextPileId = 1;
let draggedCardId = null;
let isFinalizing = false;
let nextPileZ = 1;
let activePileDrag = null;
let criterionWarningTimeout = null;
let sessionStopped = false;
let tutorialCriterionIndex = 0;
const TUTORIAL_SCENARIOS = [
  { criterion: "Fruit Type", pileA: "Citrus", pileB: "Berries" },
  { criterion: "Common Use", pileA: "Juices", pileB: "Dessert" },
];

function setup() {
  PET_TYPES.forEach((label, index) => {
    deckEl.appendChild(createCard(`card-${index + 1}`, label));
  });

  exportJsonBtn.addEventListener("click", exportHistoryAsJson);
  clearSortsBtn.addEventListener("click", clearSavedSorts);
  roundCriterionInput.addEventListener("input", updateUiState);
  finalizeForm.addEventListener("submit", (event) => event.preventDefault());
  cancelFinalizeBtn.addEventListener("click", () => {
    finalizeDialog.close();
  });
  saveContinueBtn.addEventListener("click", () => finalizeFromModal("continue"));
  saveStopBtn.addEventListener("click", () => finalizeFromModal("stop"));
  finalizeDialog.addEventListener("close", () => {
    isFinalizing = false;
  });
  tutorialForm.addEventListener("submit", () => {
    if (tutorialDontShow.checked) {
      localStorage.setItem(TUTORIAL_PREF_KEY, "1");
    } else {
      localStorage.removeItem(TUTORIAL_PREF_KEY);
    }
  });
  setupTutorialCriterionLoop();
  wireDeckDropzone();
  wireWorkspaceDropzone();
  renderHistory();
  setSessionStoppedUi(false);
  updateUiState();
  openTutorialIfNeeded();
}

function createCard(id, label) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  node.id = id;
  node.textContent = label;

  node.addEventListener("pointerdown", (event) => {
    if (!hasRoundCriterion()) {
      event.preventDefault();
      showCriterionWarning();
    }
  });

  node.addEventListener("dragstart", (event) => {
    if (!hasRoundCriterion()) {
      event.preventDefault();
      showCriterionWarning();
      return;
    }
    draggedCardId = id;
    node.classList.add("dragging");
  });

  node.addEventListener("dragend", () => {
    draggedCardId = null;
    node.classList.remove("dragging");
    document.querySelectorAll(".dropzone.over").forEach((zone) => zone.classList.remove("over"));
  });

  return node;
}

function wireDeckDropzone() {
  deckEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    deckEl.classList.add("over");
  });

  deckEl.addEventListener("dragleave", () => {
    deckEl.classList.remove("over");
  });

  deckEl.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deckEl.classList.remove("over");
    if (!draggedCardId) return;

    const card = document.getElementById(draggedCardId);
    if (!card) return;

    deckEl.appendChild(card);
    removeEmptyPiles();
    if (deckEl.children.length > 0 && finalizeDialog.open) {
      finalizeDialog.close();
      isFinalizing = false;
    }
    updateUiState();
  });
}

function wireWorkspaceDropzone() {
  workspaceEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    workspaceEl.classList.add("over");
  });

  workspaceEl.addEventListener("dragleave", () => {
    workspaceEl.classList.remove("over");
  });

  workspaceEl.addEventListener("drop", (event) => {
    event.preventDefault();
    workspaceEl.classList.remove("over");
    if (!draggedCardId) return;

    const card = document.getElementById(draggedCardId);
    if (!card) return;

    const pile = createPileAt(event.clientX, event.clientY);
    pile.querySelector(".pile-cards").appendChild(card);
    updateUiState();
  });
}

function createPileAt(clientX, clientY) {
  const workspaceRect = workspaceEl.getBoundingClientRect();
  const left = clamp(
    clientX - workspaceRect.left - PILE_WIDTH / 2,
    PILE_MARGIN,
    Math.max(PILE_MARGIN, workspaceRect.width - PILE_WIDTH - PILE_MARGIN)
  );
  const top = clamp(clientY - workspaceRect.top - 30, PILE_MARGIN, Math.max(PILE_MARGIN, workspaceRect.height - 120));

  const pile = document.createElement("section");
  pile.className = "pile";
  pile.dataset.pileId = `pile-${nextPileId++}`;
  pile.style.left = `${left}px`;
  pile.style.top = `${top}px`;
  pile.style.zIndex = String(nextPileZ++);

  const header = document.createElement("header");
  header.className = "pile-header";

  const dragHandle = document.createElement("button");
  dragHandle.className = "pile-drag-handle";
  dragHandle.type = "button";
  dragHandle.title = "Move pile";
  dragHandle.textContent = ":::";
  wirePileDrag(pile, dragHandle);

  const input = document.createElement("input");
  input.className = "pile-name";
  input.type = "text";
  input.maxLength = 40;
  input.value = `Pile ${workspaceEl.querySelectorAll(".pile").length + 1}`;
  input.setAttribute("aria-label", "Pile name");
  input.addEventListener("blur", () => {
    if (!input.value.trim()) input.value = "Unnamed pile";
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-pile";
  removeBtn.type = "button";
  removeBtn.title = "Remove pile";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => {
    const cards = [...pile.querySelectorAll(".card")];
    cards.forEach((card) => deckEl.appendChild(card));
    pile.remove();
    updateUiState();
  });

  const cardsDropzone = document.createElement("div");
  cardsDropzone.className = "dropzone pile-cards";
  cardsDropzone.setAttribute("aria-label", "Pile cards");
  wirePileDropzone(cardsDropzone);

  header.appendChild(dragHandle);
  header.appendChild(input);
  header.appendChild(removeBtn);
  pile.appendChild(header);
  pile.appendChild(cardsDropzone);
  workspaceEl.appendChild(pile);
  settlePilePosition(pile);
  return pile;
}

function wirePileDrag(pile, handle) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (draggedCardId) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const pileRect = pile.getBoundingClientRect();
    activePileDrag = {
      pile,
      offsetX: event.clientX - pileRect.left,
      offsetY: event.clientY - pileRect.top,
      pointerId: event.pointerId,
      handle,
    };

    pile.classList.add("moving");
    pile.style.zIndex = String(nextPileZ++);
    window.addEventListener("pointermove", onPileDragMove);
    window.addEventListener("pointerup", onPileDragEnd);
    window.addEventListener("pointercancel", onPileDragEnd);
  });
}

function onPileDragMove(event) {
  if (!activePileDrag) return;
  if (event.pointerId !== activePileDrag.pointerId) return;

  const { pile, offsetX, offsetY } = activePileDrag;
  const workspaceRect = workspaceEl.getBoundingClientRect();
  const pileWidth = pile.offsetWidth || PILE_WIDTH;
  const pileHeight = pile.offsetHeight || 120;

  const left = clamp(
    event.clientX - workspaceRect.left - offsetX,
    PILE_MARGIN,
    Math.max(PILE_MARGIN, workspaceRect.width - pileWidth - PILE_MARGIN)
  );

  const top = clamp(
    event.clientY - workspaceRect.top - offsetY,
    PILE_MARGIN,
    Math.max(PILE_MARGIN, workspaceRect.height - pileHeight - PILE_MARGIN)
  );

  const candidate = { left, top, right: left + pileWidth, bottom: top + pileHeight };
  if (hasPileCollision(candidate, pile)) {
    const openSpot = findNearestOpenSpot(pile, left, top);
    pile.style.left = `${openSpot.left}px`;
    pile.style.top = `${openSpot.top}px`;
    return;
  }

  pile.style.left = `${left}px`;
  pile.style.top = `${top}px`;
}

function onPileDragEnd(event) {
  if (!activePileDrag) return;
  if (event && event.pointerId !== activePileDrag.pointerId) return;

  if (activePileDrag.handle.hasPointerCapture(activePileDrag.pointerId)) {
    activePileDrag.handle.releasePointerCapture(activePileDrag.pointerId);
  }
  settlePilePosition(activePileDrag.pile);
  activePileDrag.pile.classList.remove("moving");
  activePileDrag = null;
  window.removeEventListener("pointermove", onPileDragMove);
  window.removeEventListener("pointerup", onPileDragEnd);
  window.removeEventListener("pointercancel", onPileDragEnd);
}

function wirePileDropzone(zone) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
    zone.classList.add("over");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("over");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    zone.classList.remove("over");
    if (!draggedCardId) return;

    const card = document.getElementById(draggedCardId);
    if (!card) return;

    zone.appendChild(card);
    updateUiState();
  });
}

function removeEmptyPiles() {
  workspaceEl.querySelectorAll(".pile").forEach((pile) => {
    if (pile.querySelectorAll(".card").length === 0) {
      pile.remove();
    }
  });
}

function updateUiState() {
  const unsorted = deckEl.children.length;
  const hasCriterion = hasRoundCriterion();
  deckCountEl.textContent = String(unsorted);
  roundCountEl.textContent = String(readHistory().length);
  criterionPanel.classList.toggle("needs-criterion", !hasCriterion);

  if (hasCriterion) {
    criterionPanel.classList.remove("warning-active");
    if (criterionWarningTimeout) {
      clearTimeout(criterionWarningTimeout);
      criterionWarningTimeout = null;
    }
  }

  document.querySelectorAll(".card").forEach((card) => {
    card.draggable = hasCriterion && !sessionStopped;
  });

  if (unsorted === 0 && hasCriterion && !isFinalizing && !finalizeDialog.open && !sessionStopped) {
    openFinalizeDialog();
  }
}

function collectCurrentSort() {
  return [...workspaceEl.querySelectorAll(".pile")]
    .map((pile) => {
      const pileName = pile.querySelector(".pile-name").value.trim() || "Unnamed pile";
      const cards = [...pile.querySelectorAll(".card")].map((card) => card.textContent);
      return { pileName, cards };
    })
    .filter((pile) => pile.cards.length > 0);
}

function saveCurrentSort() {
  const sortData = collectCurrentSort();
  if (sortData.length === 0) return;
  const criterion = roundCriterionInput.value.trim();
  if (!criterion) return;

  const history = readHistory();
  history.unshift({
    savedAt: new Date().toISOString(),
    criterion,
    piles: sortData,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return true;
}

function openFinalizeDialog() {
  finalizePileNamesEl.innerHTML = "";
  finalizeErrorEl.textContent = "";
  finalizeCriterionInput.value = roundCriterionInput.value.trim();

  const piles = [...workspaceEl.querySelectorAll(".pile")];
  piles.forEach((pile, index) => {
    const row = document.createElement("label");
    row.className = "finalize-pile-row";
    row.htmlFor = `finalize-pile-name-${index + 1}`;
    row.textContent = `Pile ${index + 1}`;

    const input = document.createElement("input");
    input.id = `finalize-pile-name-${index + 1}`;
    input.type = "text";
    input.maxLength = 40;
    input.required = true;
    input.value = pile.querySelector(".pile-name").value.trim() || `Pile ${index + 1}`;
    input.dataset.pileId = pile.dataset.pileId;

    row.appendChild(input);
    finalizePileNamesEl.appendChild(row);
  });

  finalizeDialog.showModal();
  isFinalizing = true;
}

function finalizeFromModal(mode) {
  if (!validateFinalizeModal()) return;
  const nameInputs = [...finalizePileNamesEl.querySelectorAll("input")];
  nameInputs.forEach((nameInput, index) => {
    const pile = workspaceEl.querySelector(`.pile[data-pile-id="${nameInput.dataset.pileId}"]`);
    if (!pile) return;
    pile.querySelector(".pile-name").value = nameInput.value.trim() || `Pile ${index + 1}`;
  });
  roundCriterionInput.value = finalizeCriterionInput.value.trim();

  const saved = saveCurrentSort();
  if (!saved) return;
  finalizeDialog.close();
  isFinalizing = false;

  if (mode === "continue") {
    sessionStopped = false;
    setSessionStoppedUi(false);
    resetBoard();
  } else {
    sessionStopped = true;
    setSessionStoppedUi(true);
    roundCriterionInput.disabled = true;
  }

  renderHistory();
  updateUiState();
}

function resetBoard() {
  deckEl.innerHTML = "";
  workspaceEl.innerHTML = "";
  roundCriterionInput.value = "";
  roundCriterionInput.disabled = false;
  sessionStopped = false;
  nextPileId = 1;

  PET_TYPES.forEach((label, index) => {
    deckEl.appendChild(createCard(`card-${index + 1}`, label));
  });
}

function setSessionStoppedUi(stopped) {
  if (sortPanelEl) {
    sortPanelEl.hidden = stopped;
  }
  if (stopMessageEl) {
    stopMessageEl.hidden = !stopped;
  }
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = readHistory();
  historyEl.innerHTML = "";

  if (history.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No sorts saved yet.";
    historyEl.appendChild(li);
    roundCountEl.textContent = "0";
    return;
  }

  history.forEach((round, idx) => {
    const li = document.createElement("li");
    const date = new Date(round.savedAt).toLocaleString();
    const summary = round.piles.map((p) => `${p.pileName} (${p.cards.length})`).join(", ");
    li.textContent = `Sort ${history.length - idx} - ${date} - Criterion: ${round.criterion || "Not specified"} - ${summary}`;
    historyEl.appendChild(li);
  });

  roundCountEl.textContent = String(history.length);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function settlePilePosition(pile) {
  const currentLeft = parseFloat(pile.style.left) || 0;
  const currentTop = parseFloat(pile.style.top) || 0;
  const openSpot = findNearestOpenSpot(pile, currentLeft, currentTop);
  pile.style.left = `${openSpot.left}px`;
  pile.style.top = `${openSpot.top}px`;
}

function findNearestOpenSpot(pile, preferredLeft, preferredTop) {
  const width = pile.offsetWidth || PILE_WIDTH;
  const height = pile.offsetHeight || 120;
  const workspaceWidth = workspaceEl.clientWidth;
  const workspaceHeight = workspaceEl.clientHeight;
  const maxLeft = Math.max(PILE_MARGIN, workspaceWidth - width - PILE_MARGIN);
  const maxTop = Math.max(PILE_MARGIN, workspaceHeight - height - PILE_MARGIN);
  const startLeft = clamp(preferredLeft, PILE_MARGIN, maxLeft);
  const startTop = clamp(preferredTop, PILE_MARGIN, maxTop);

  const candidate = { left: startLeft, top: startTop, right: startLeft + width, bottom: startTop + height };
  if (!hasPileCollision(candidate, pile)) {
    return { left: startLeft, top: startTop };
  }

  const maxRadius = Math.ceil(Math.max(workspaceWidth, workspaceHeight) / SNAP_STEP);
  for (let ring = 1; ring <= maxRadius; ring += 1) {
    const offsets = [];

    for (let dx = -ring; dx <= ring; dx += 1) {
      offsets.push({ dx, dy: -ring });
      offsets.push({ dx, dy: ring });
    }

    for (let dy = -ring + 1; dy <= ring - 1; dy += 1) {
      offsets.push({ dx: -ring, dy });
      offsets.push({ dx: ring, dy });
    }

    for (const offset of offsets) {
      const left = clamp(startLeft + offset.dx * SNAP_STEP, PILE_MARGIN, maxLeft);
      const top = clamp(startTop + offset.dy * SNAP_STEP, PILE_MARGIN, maxTop);
      const box = { left, top, right: left + width, bottom: top + height };
      if (!hasPileCollision(box, pile)) {
        return { left, top };
      }
    }
  }

  return { left: startLeft, top: startTop };
}

function hasPileCollision(box, pileToIgnore) {
  const otherPiles = [...workspaceEl.querySelectorAll(".pile")].filter((pile) => pile !== pileToIgnore);
  return otherPiles.some((otherPile) => {
    const otherLeft = parseFloat(otherPile.style.left) || 0;
    const otherTop = parseFloat(otherPile.style.top) || 0;
    const otherWidth = otherPile.offsetWidth || PILE_WIDTH;
    const otherHeight = otherPile.offsetHeight || 120;
    const other = {
      left: otherLeft,
      top: otherTop,
      right: otherLeft + otherWidth,
      bottom: otherTop + otherHeight,
    };
    return boxesOverlap(box, other, PILE_GAP);
  });
}

function boxesOverlap(a, b, gap = 0) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  );
}

function openTutorialIfNeeded() {
  const hideTutorial = localStorage.getItem(TUTORIAL_PREF_KEY) === "1";
  if (!hideTutorial) {
    setTutorialCriterionText();
    tutorialDialog.showModal();
  }
}

function setupTutorialCriterionLoop() {
  if (!tutorialStepAnchor || !tutorialCriterionValue) return;
  tutorialStepAnchor.addEventListener("animationiteration", () => {
    tutorialCriterionIndex = (tutorialCriterionIndex + 1) % TUTORIAL_SCENARIOS.length;
    setTutorialCriterionText();
  });
}

function setTutorialCriterionText() {
  if (!tutorialCriterionValue) return;
  const scenario = TUTORIAL_SCENARIOS[tutorialCriterionIndex];
  tutorialCriterionValue.textContent = scenario.criterion;
  tutorialCriterionValue.style.setProperty("--criterion-ch", `${scenario.criterion.length}ch`);
  if (tutorialPileNameA) tutorialPileNameA.textContent = scenario.pileA;
  if (tutorialPileNameB) tutorialPileNameB.textContent = scenario.pileB;
}

function hasRoundCriterion() {
  return Boolean(roundCriterionInput.value.trim());
}

function showCriterionWarning() {
  criterionPanel.classList.add("warning-active", "needs-criterion");
  roundCriterionInput.focus();

  if (criterionWarningTimeout) {
    clearTimeout(criterionWarningTimeout);
  }

  criterionWarningTimeout = setTimeout(() => {
    if (!hasRoundCriterion()) {
      criterionPanel.classList.remove("warning-active");
    }
    criterionWarningTimeout = null;
  }, 2600);
}

function validateFinalizeModal() {
  finalizeErrorEl.textContent = "";
  const criterion = finalizeCriterionInput.value.trim();
  if (!criterion) {
    finalizeErrorEl.textContent = "Enter a criterion before saving.";
    finalizeCriterionInput.focus();
    return false;
  }

  const nameInputs = [...finalizePileNamesEl.querySelectorAll("input")];
  for (const input of nameInputs) {
    const name = input.value.trim();
    if (!name) {
      finalizeErrorEl.textContent = "All piles must have names before saving.";
      input.focus();
      return false;
    }
    if (/^pile\s*\d+$/i.test(name)) {
      finalizeErrorEl.textContent = "Rename default pile names (e.g., “Pile 1”) before saving.";
      input.focus();
      return false;
    }
  }

  return true;
}

function exportHistoryAsJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rounds: readHistory(),
  };
  const content = JSON.stringify(payload, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `card-sorter-rounds-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearSavedSorts() {
  const hasSavedSorts = readHistory().length > 0;
  if (!hasSavedSorts) {
    alert("There are no saved sorts to clear.");
    return;
  }
  const confirmed = window.confirm("Clear all saved sorts? This cannot be undone.");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  updateUiState();
}

setup();
