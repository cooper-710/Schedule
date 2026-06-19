const STORAGE_KEY = "notes-schedule-items-v2";
const LEGACY_STORAGE_KEY = "notes-schedule-items-v1";

const PLAYERS = [
  { name: "Pete Alonso", team: "BAL", role: "hitter", level: "MLB", upload: true },
  { name: "Chase Dollander", team: "COL", role: "pitcher", level: "MLB", upload: true },
  { name: "Darell Hernaiz", team: "LV", role: "hitter", level: "AAA", upload: true },
  { name: "Matt Chapman", team: "SF", role: "hitter", level: "MLB", upload: true },
  { name: "Lance McCullers", team: "HOU", role: "pitcher", level: "MLB", upload: true, manual: true },
  { name: "Tarik Skubal", team: "DET", role: "pitcher", level: "MLB", upload: true },
  { name: "Brady House", team: "ROC", role: "hitter", level: "AAA", upload: true },
  { name: "Harrison Bader", team: "SF", role: "hitter", level: "MLB", upload: true },
  { name: "Ryne Stanek", team: "STL", role: "pitcher", level: "MLB", upload: false, manual: true },
  { name: "Shane McClanahan", team: "TB", role: "pitcher", level: "MLB", upload: true },
  { name: "Anthony Seigler", team: "WOR", role: "hitter", level: "AAA", upload: false },
  { name: "Drew Gilbert", team: "SF", role: "hitter", level: "MLB", upload: true },
  { name: "Sean Manaea", team: "NYM", role: "pitcher", level: "MLB", upload: false, manual: true },
  { name: "Ben Malgeri", team: "TOL", role: "hitter", level: "AAA", upload: false },
  { name: "Josh Kasevich", team: "BUF", role: "hitter", level: "AAA", upload: true },
  { name: "Jordyn Adams", team: "NAS", role: "hitter", level: "AAA", upload: true },
  { name: "Michael Grove", team: "DUR", role: "pitcher", level: "AAA", upload: false },
  { name: "Charlie Condon", team: "ABQ", role: "hitter", level: "AAA", upload: false },
  { name: "Matthew Liberatore", team: "STL", role: "pitcher", level: "MLB", upload: false, manual: true },
];

const elements = {
  todayLabel: document.querySelector("#todayLabel"),
  clockLabel: document.querySelector("#clockLabel"),
  summaryText: document.querySelector("#summaryText"),
  overdueCount: document.querySelector("#overdueCount"),
  todayCount: document.querySelector("#todayCount"),
  upcomingCount: document.querySelector("#upcomingCount"),
  sentCount: document.querySelector("#sentCount"),
  quickAddButton: document.querySelector("#quickAddButton"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  scheduleGroups: document.querySelector("#scheduleGroups"),
  noteTemplate: document.querySelector("#noteTemplate"),
  seriesForm: document.querySelector("#seriesForm"),
  seriesOpponentInput: document.querySelector("#seriesOpponentInput"),
  seriesStartInput: document.querySelector("#seriesStartInput"),
  leadDaysInput: document.querySelector("#leadDaysInput"),
  seriesDueTimeInput: document.querySelector("#seriesDueTimeInput"),
  teamFilterInput: document.querySelector("#teamFilterInput"),
  includeAutoInput: document.querySelector("#includeAutoInput"),
  includeManualInput: document.querySelector("#includeManualInput"),
  form: document.querySelector("#noteForm"),
  formTitle: document.querySelector("#formTitle"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  noteId: document.querySelector("#noteId"),
  typeInput: document.querySelector("#typeInput"),
  titleInput: document.querySelector("#titleInput"),
  recipientInput: document.querySelector("#recipientInput"),
  destinationInput: document.querySelector("#destinationInput"),
  dateInput: document.querySelector("#dateInput"),
  timeInput: document.querySelector("#timeInput"),
  repeatInput: document.querySelector("#repeatInput"),
  detailsInput: document.querySelector("#detailsInput"),
  madeInput: document.querySelector("#madeInput"),
  sentInput: document.querySelector("#sentInput"),
};

let notes = loadNotes();

function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map(normalizeNote);
  } catch {
    return [];
  }
}

function normalizeNote(note) {
  return {
    type: "manual",
    player: "",
    team: "",
    role: "",
    level: "",
    opponent: "",
    seriesStart: "",
    uploadMode: "manual",
    ...note,
  };
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

function todayDateInputValue() {
  return formatDateInput(new Date());
}

function combineDateTime(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue || "09:00"}:00`);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dueStatus(note) {
  if (note.sent) return "sent";

  const due = combineDateTime(note.dueDate, note.dueTime);
  const now = new Date();
  if (due < now) return "overdue";
  if (isSameDay(due, now)) return "today";

  const soonCutoff = new Date(now);
  soonCutoff.setHours(soonCutoff.getHours() + 72);
  if (due <= soonCutoff) return "soon";

  return "upcoming";
}

function relativeDueLabel(note) {
  const due = combineDateTime(note.dueDate, note.dueTime);
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (isSameDay(due, new Date())) {
    return `Today at ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  const tomorrow = startOfToday();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(due, tomorrow)) {
    return `Tomorrow at ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  return formatter.format(due);
}

function resetForm() {
  elements.form.reset();
  elements.noteId.value = "";
  elements.typeInput.value = "manual";
  elements.dateInput.value = todayDateInputValue();
  elements.timeInput.value = "09:00";
  elements.repeatInput.value = "none";
  elements.formTitle.textContent = "Series tasks";
  elements.cancelEditButton.classList.add("hidden");
}

function resetSeriesForm() {
  elements.seriesForm.reset();
  elements.seriesStartInput.value = addDays(todayDateInputValue(), 3);
  elements.leadDaysInput.value = "3";
  elements.seriesDueTimeInput.value = "09:00";
  elements.includeAutoInput.checked = true;
  elements.includeManualInput.checked = true;
}

function filteredNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filter = elements.statusFilter.value;

  return notes
    .filter((note) => {
      const haystack = [
        note.title,
        note.player,
        note.team,
        note.role,
        note.level,
        note.recipient,
        note.destination,
        note.opponent,
        note.details,
      ]
        .join(" ")
        .toLowerCase();
      const status = dueStatus(note);
      const matchesQuery = haystack.includes(query);
      const matchesStatus =
        filter === "all" ||
        (filter === "active" && status !== "sent") ||
        (filter === "auto" && note.type === "auto") ||
        (filter === "manual" && note.type === "manual") ||
        filter === status;
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime));
}

function updateStats() {
  const counts = notes.reduce(
    (totals, note) => {
      const status = dueStatus(note);
      totals[status] += 1;
      return totals;
    },
    { overdue: 0, today: 0, soon: 0, upcoming: 0, sent: 0 },
  );

  elements.overdueCount.textContent = counts.overdue;
  elements.todayCount.textContent = counts.today;
  elements.upcomingCount.textContent = counts.soon;
  elements.sentCount.textContent = counts.sent;

  if (!notes.length) {
    elements.summaryText.textContent = "Create the next series checklist to start tracking coverage.";
  } else if (counts.overdue) {
    elements.summaryText.textContent = `${counts.overdue} item${counts.overdue === 1 ? "" : "s"} overdue. Clear these first.`;
  } else if (counts.today) {
    elements.summaryText.textContent = `${counts.today} item${counts.today === 1 ? "" : "s"} due today.`;
  } else if (counts.soon) {
    elements.summaryText.textContent = `${counts.soon} item${counts.soon === 1 ? "" : "s"} due in the next 72 hours.`;
  } else {
    elements.summaryText.textContent = "You are ahead of the next send window.";
  }
}

function render() {
  updateClock();
  updateStats();

  const visibleNotes = filteredNotes();
  elements.scheduleGroups.innerHTML = "";

  if (!visibleNotes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = notes.length
      ? "No items match this view."
      : "No coverage scheduled yet. Create a series checklist on the right.";
    elements.scheduleGroups.append(empty);
    return;
  }

  const groups = [
    ["overdue", "Overdue"],
    ["today", "Due today"],
    ["soon", "Next 72 hours"],
    ["upcoming", "Later"],
    ["sent", "Done"],
  ];

  groups.forEach(([status, label]) => {
    const groupNotes = visibleNotes.filter((note) => dueStatus(note) === status);
    if (!groupNotes.length) return;

    const section = document.createElement("section");
    const heading = document.createElement("div");
    heading.className = "group-title";
    heading.innerHTML = `<span>${label}</span><span>${groupNotes.length}</span>`;

    const list = document.createElement("div");
    list.className = "group-list";
    groupNotes.forEach((note) => list.append(renderNote(note)));

    section.append(heading, list);
    elements.scheduleGroups.append(section);
  });
}

function renderNote(note) {
  const node = elements.noteTemplate.content.firstElementChild.cloneNode(true);
  const status = dueStatus(note);
  const title = node.querySelector("h3");
  const pill = node.querySelector(".status-pill");
  const meta = node.querySelector(".meta-line");
  const details = node.querySelector(".details-line");
  const madeAction = node.querySelector(".made-action");
  const sentAction = node.querySelector(".sent-action");
  const editAction = node.querySelector(".edit-action");
  const deleteAction = node.querySelector(".delete-action");

  node.classList.toggle("overdue", status === "overdue");
  node.classList.toggle("sent", status === "sent");
  node.classList.toggle("manual", note.type === "manual");

  title.textContent = note.title;
  pill.textContent = statusLabel(status);
  pill.classList.add(status);

  const tags = [
    relativeDueLabel(note),
    note.seriesStart ? `Series ${formatShortDate(note.seriesStart)}` : "",
    note.team ? `${note.team} ${note.level || ""}`.trim() : "",
    note.role || "",
    uploadLabel(note),
  ].filter(Boolean);
  meta.textContent = tags.join(" | ");

  details.textContent = note.details || "No prep notes added.";
  madeAction.textContent = madeLabel(note);
  sentAction.textContent = sentLabel(note);
  madeAction.classList.toggle("done", note.made);
  sentAction.classList.toggle("done", note.sent);

  madeAction.addEventListener("click", () => {
    updateNote(note.id, { made: !note.made });
  });

  sentAction.addEventListener("click", () => {
    toggleSent(note);
  });

  editAction.addEventListener("click", () => {
    startEditing(note);
  });

  deleteAction.addEventListener("click", () => {
    const confirmed = window.confirm(`Delete "${note.title}" from the schedule?`);
    if (!confirmed) return;
    notes = notes.filter((item) => item.id !== note.id);
    saveNotes();
    render();
  });

  return node;
}

function statusLabel(status) {
  const labels = {
    overdue: "Overdue",
    today: "Due today",
    soon: "Next 72h",
    upcoming: "Later",
    sent: "Done",
  };
  return labels[status];
}

function uploadLabel(note) {
  if (note.uploadMode === "auto-upload") return "auto-upload";
  if (note.uploadMode === "local-only") return "local only";
  if (note.uploadMode === "manual-send") return "manual send";
  return note.destination || "";
}

function madeLabel(note) {
  if (note.made) return note.type === "auto" ? "Generated" : "Made";
  return note.type === "auto" ? "Mark generated" : "Mark made";
}

function sentLabel(note) {
  if (note.sent) {
    if (note.uploadMode === "auto-upload") return "Uploaded";
    if (note.uploadMode === "local-only") return "Cleared";
    return "Sent";
  }
  if (note.uploadMode === "auto-upload") return "Mark uploaded";
  if (note.uploadMode === "local-only") return "Mark cleared";
  return "Mark sent";
}

function formatShortDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function updateNote(id, updates) {
  notes = notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note));
  saveNotes();
  render();
}

function toggleSent(note) {
  if (note.sent) {
    updateNote(note.id, { sent: false, sentAt: null });
    return;
  }

  const updates = { sent: true, made: true, sentAt: new Date().toISOString() };
  updateNote(note.id, updates);

  if (note.repeat !== "none") {
    createNextRecurringNote(note);
  }
}

function createNextRecurringNote(note) {
  const nextDue = combineDateTime(note.dueDate, note.dueTime);
  if (note.repeat === "daily") nextDue.setDate(nextDue.getDate() + 1);
  if (note.repeat === "weekly") nextDue.setDate(nextDue.getDate() + 7);
  if (note.repeat === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);

  const alreadyExists = notes.some(
    (item) =>
      item.parentId === note.id &&
      item.dueDate === formatDateInput(nextDue) &&
      item.dueTime === note.dueTime,
  );

  if (alreadyExists) return;

  notes = [
    ...notes,
    {
      ...note,
      id: crypto.randomUUID(),
      parentId: note.id,
      dueDate: formatDateInput(nextDue),
      dueTime: note.dueTime,
      made: false,
      sent: false,
      sentAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  saveNotes();
  render();
}

function startEditing(note) {
  elements.noteId.value = note.id;
  elements.typeInput.value = note.type || "manual";
  elements.titleInput.value = note.title;
  elements.recipientInput.value = note.recipient;
  elements.destinationInput.value = note.destination;
  elements.dateInput.value = note.dueDate;
  elements.timeInput.value = note.dueTime;
  elements.repeatInput.value = note.repeat;
  elements.detailsInput.value = note.details;
  elements.madeInput.checked = note.made;
  elements.sentInput.checked = note.sent;
  elements.formTitle.textContent = "Edit item";
  elements.cancelEditButton.classList.remove("hidden");
  elements.titleInput.focus();
}

function handleSubmit(event) {
  event.preventDefault();

  const id = elements.noteId.value || crypto.randomUUID();
  const existing = notes.find((note) => note.id === id);
  const now = new Date().toISOString();
  const note = normalizeNote({
    ...existing,
    id,
    type: elements.typeInput.value,
    title: elements.titleInput.value.trim(),
    recipient: elements.recipientInput.value.trim(),
    destination: elements.destinationInput.value.trim(),
    dueDate: elements.dateInput.value,
    dueTime: elements.timeInput.value,
    repeat: elements.repeatInput.value,
    details: elements.detailsInput.value.trim(),
    made: elements.madeInput.checked,
    sent: elements.sentInput.checked,
    sentAt: elements.sentInput.checked ? existing?.sentAt || now : null,
    uploadMode: existing?.uploadMode || (elements.typeInput.value === "auto" ? "auto-upload" : "manual-send"),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });

  if (existing) {
    notes = notes.map((item) => (item.id === id ? note : item));
  } else {
    notes = [...notes, note];
  }

  saveNotes();
  resetForm();
  render();
}

function handleSeriesSubmit(event) {
  event.preventDefault();

  const opponent = elements.seriesOpponentInput.value.trim();
  const seriesStart = elements.seriesStartInput.value;
  const leadDays = Number(elements.leadDaysInput.value);
  const dueDate = addDays(seriesStart, -leadDays);
  const dueTime = elements.seriesDueTimeInput.value;
  const teamFilter = elements.teamFilterInput.value.trim().toUpperCase();
  const includeAuto = elements.includeAutoInput.checked;
  const includeManual = elements.includeManualInput.checked;
  const roster = teamFilter ? PLAYERS.filter((player) => player.team === teamFilter) : PLAYERS;
  const tasks = [];

  if (includeAuto) {
    roster.forEach((player) => {
      tasks.push(buildAutoReportTask(player, opponent, seriesStart, dueDate, dueTime));
    });
  }

  if (includeManual) {
    roster.filter((player) => player.manual).forEach((player) => {
      tasks.push(buildManualTask(player, opponent, seriesStart, dueDate, dueTime));
    });
  }

  const uniqueTasks = tasks.filter((task) => !isDuplicateTask(task));
  notes = [...notes, ...uniqueTasks];
  saveNotes();
  render();

  const skipped = tasks.length - uniqueTasks.length;
  elements.summaryText.textContent = skipped
    ? `Added ${uniqueTasks.length} item${uniqueTasks.length === 1 ? "" : "s"} and skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.`
    : `Added ${uniqueTasks.length} series item${uniqueTasks.length === 1 ? "" : "s"}.`;
}

function buildAutoReportTask(player, opponent, seriesStart, dueDate, dueTime) {
  const roleLabel = player.role === "hitter" ? "hitter scouting report" : "pitcher scouting report";
  const uploadMode = player.upload ? "auto-upload" : "local-only";
  return normalizeNote({
    id: crypto.randomUUID(),
    type: "auto",
    player: player.name,
    team: player.team,
    role: player.role,
    level: player.level,
    opponent,
    seriesStart,
    uploadMode,
    title: `${player.name} ${roleLabel} ${opponent}`,
    recipient: player.upload ? "Auto-upload queue" : "Local review",
    destination: player.upload ? "build/pdf upload queue" : "build/pdf local only",
    dueDate,
    dueTime,
    repeat: "none",
    details: `Pre-series PDF for ${player.name}. Output: build/pdf/YYYY-MM-DD/Player vs Opponent.pdf. ${player.upload ? "Uploader should send this automatically." : "Upload is off, so confirm whether this needs manual delivery."}`,
    made: false,
    sent: false,
    sentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function buildManualTask(player, opponent, seriesStart, dueDate, dueTime) {
  return normalizeNote({
    id: crypto.randomUUID(),
    type: "manual",
    player: player.name,
    team: player.team,
    role: player.role,
    level: player.level,
    opponent,
    seriesStart,
    uploadMode: "manual-send",
    title: `${player.name} handwritten notes ${opponent}`,
    recipient: "Manual send list",
    destination: "Handwritten notes",
    dueDate,
    dueTime,
    repeat: "none",
    details: `Handwritten notes for ${player.name}. Must be made and sent ${dueDate}, before the ${formatShortDate(seriesStart)} series starts.`,
    made: false,
    sent: false,
    sentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function isDuplicateTask(task) {
  return notes.some(
    (note) =>
      note.title === task.title &&
      note.seriesStart === task.seriesStart &&
      note.dueDate === task.dueDate &&
      note.type === task.type,
  );
}

function updateClock() {
  const now = new Date();
  elements.todayLabel.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  elements.clockLabel.textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

elements.form.addEventListener("submit", handleSubmit);
elements.seriesForm.addEventListener("submit", handleSeriesSubmit);
elements.cancelEditButton.addEventListener("click", resetForm);
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.quickAddButton.addEventListener("click", () => elements.titleInput.focus());

resetForm();
resetSeriesForm();
render();
setInterval(render, 60_000);
