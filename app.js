const NOTE_STORAGE_KEY = "notes-schedule-items-v3";
const PLAYER_STORAGE_KEY = "notes-schedule-players-v1";
const LEGACY_NOTE_KEYS = ["notes-schedule-items-v2", "notes-schedule-items-v1"];
const TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams?sportIds=1,11&activeStatus=Y";

const DEFAULT_PLAYERS = [
  { name: "Pete Alonso", team: "BAL", teamId: 110, role: "hitter", level: "MLB", upload: true },
  { name: "Chase Dollander", team: "COL", teamId: 115, role: "pitcher", level: "MLB", upload: true },
  { name: "Darell Hernaiz", team: "LV", teamId: 400, role: "hitter", level: "AAA", upload: true },
  { name: "Matt Chapman", team: "SF", teamId: 137, role: "hitter", level: "MLB", upload: true },
  { name: "Lance McCullers", team: "HOU", teamId: 117, role: "pitcher", level: "MLB", upload: true, manual: true },
  { name: "Tarik Skubal", team: "DET", teamId: 116, role: "pitcher", level: "MLB", upload: true },
  { name: "Brady House", team: "ROC", teamId: 534, role: "hitter", level: "AAA", upload: true },
  { name: "Harrison Bader", team: "SF", teamId: 137, role: "hitter", level: "MLB", upload: true },
  { name: "Ryne Stanek", team: "STL", teamId: 138, role: "pitcher", level: "MLB", upload: false, manual: true },
  { name: "Shane McClanahan", team: "TB", teamId: 139, role: "pitcher", level: "MLB", upload: true },
  { name: "Anthony Seigler", team: "WOR", teamId: 533, role: "hitter", level: "AAA", upload: false },
  { name: "Drew Gilbert", team: "SF", teamId: 137, role: "hitter", level: "MLB", upload: true },
  { name: "Sean Manaea", team: "NYM", teamId: 121, role: "pitcher", level: "MLB", upload: false, manual: true },
  { name: "Ben Malgeri", team: "TOL", teamId: 512, role: "hitter", level: "AAA", upload: false },
  { name: "Josh Kasevich", team: "BUF", teamId: 422, role: "hitter", level: "AAA", upload: true },
  { name: "Jordyn Adams", team: "NAS", teamId: 556, role: "hitter", level: "AAA", upload: true },
  { name: "Michael Grove", team: "DUR", teamId: 234, role: "pitcher", level: "AAA", upload: false },
  { name: "Charlie Condon", team: "ABQ", teamId: 342, role: "hitter", level: "AAA", upload: false },
  { name: "Matthew Liberatore", team: "STL", teamId: 138, role: "pitcher", level: "MLB", upload: false, manual: true },
];

const elements = {
  todayLabel: document.querySelector("#todayLabel"),
  clockLabel: document.querySelector("#clockLabel"),
  summaryText: document.querySelector("#summaryText"),
  rosterSummary: document.querySelector("#rosterSummary"),
  overdueCount: document.querySelector("#overdueCount"),
  todayCount: document.querySelector("#todayCount"),
  upcomingCount: document.querySelector("#upcomingCount"),
  sentCount: document.querySelector("#sentCount"),
  loadSchedulesButton: document.querySelector("#loadSchedulesButton"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  scheduleGroups: document.querySelector("#scheduleGroups"),
  noteTemplate: document.querySelector("#noteTemplate"),
  scheduleForm: document.querySelector("#scheduleForm"),
  scheduleStartInput: document.querySelector("#scheduleStartInput"),
  lookaheadInput: document.querySelector("#lookaheadInput"),
  leadDaysInput: document.querySelector("#leadDaysInput"),
  scheduleDueTimeInput: document.querySelector("#scheduleDueTimeInput"),
  scheduleTeamFilterInput: document.querySelector("#scheduleTeamFilterInput"),
  includeAutoInput: document.querySelector("#includeAutoInput"),
  includeManualInput: document.querySelector("#includeManualInput"),
  apiStatus: document.querySelector("#apiStatus"),
  playerList: document.querySelector("#playerList"),
  playerForm: document.querySelector("#playerForm"),
  playerIdInput: document.querySelector("#playerIdInput"),
  playerNameInput: document.querySelector("#playerNameInput"),
  playerTeamInput: document.querySelector("#playerTeamInput"),
  playerTeamIdInput: document.querySelector("#playerTeamIdInput"),
  playerLevelInput: document.querySelector("#playerLevelInput"),
  playerRoleInput: document.querySelector("#playerRoleInput"),
  playerUploadInput: document.querySelector("#playerUploadInput"),
  playerManualInput: document.querySelector("#playerManualInput"),
  cancelPlayerEditButton: document.querySelector("#cancelPlayerEditButton"),
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
let players = loadPlayers();
let teamCache = null;

function loadNotes() {
  try {
    const saved = localStorage.getItem(NOTE_STORAGE_KEY) || LEGACY_NOTE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!saved) return [];
    return JSON.parse(saved).map(normalizeNote);
  } catch {
    return [];
  }
}

function loadPlayers() {
  try {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    const source = saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
    return source.map(normalizePlayer);
  } catch {
    return DEFAULT_PLAYERS.map(normalizePlayer);
  }
}

function normalizePlayer(player) {
  return {
    id: player.id || stablePlayerId(player.name),
    name: player.name || "",
    team: (player.team || "").toUpperCase(),
    teamId: player.teamId ? Number(player.teamId) : null,
    level: player.level === "AAA" ? "AAA" : "MLB",
    role: player.role === "pitcher" ? "pitcher" : "hitter",
    upload: Boolean(player.upload),
    manual: Boolean(player.manual),
  };
}

function stablePlayerId(name) {
  const slug = String(name || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `player-${slug || crypto.randomUUID()}`;
}

function normalizeNote(note) {
  return {
    type: "manual",
    player: "",
    playerId: "",
    team: "",
    teamId: null,
    role: "",
    level: "",
    opponent: "",
    opponentId: null,
    seriesStart: "",
    seriesEnd: "",
    seriesKey: "",
    uploadMode: "manual",
    ...note,
  };
}

function saveNotes() {
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
}

function savePlayers() {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
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
  elements.formTitle.textContent = "Manual item";
  elements.cancelEditButton.classList.add("hidden");
}

function resetScheduleForm() {
  elements.scheduleStartInput.value = todayDateInputValue();
  elements.lookaheadInput.value = "14";
  elements.leadDaysInput.value = "3";
  elements.scheduleDueTimeInput.value = "09:00";
  elements.includeAutoInput.checked = true;
  elements.includeManualInput.checked = true;
}

function resetPlayerForm() {
  elements.playerForm.reset();
  elements.playerIdInput.value = "";
  elements.playerLevelInput.value = "MLB";
  elements.playerRoleInput.value = "hitter";
  elements.playerUploadInput.checked = false;
  elements.playerManualInput.checked = false;
  elements.cancelPlayerEditButton.classList.add("hidden");
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
        note.teamId,
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

  const hitterCount = players.filter((player) => player.role === "hitter").length;
  const pitcherCount = players.filter((player) => player.role === "pitcher").length;
  const manualCount = players.filter((player) => player.manual).length;

  elements.overdueCount.textContent = counts.overdue;
  elements.todayCount.textContent = counts.today;
  elements.upcomingCount.textContent = counts.soon;
  elements.sentCount.textContent = counts.sent;
  elements.rosterSummary.textContent = `${players.length} players | ${hitterCount} hitters | ${pitcherCount} pitchers | ${manualCount} manual`;

  if (!notes.length) {
    elements.summaryText.textContent = "Load schedules to create the next set of report tasks.";
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
  renderPlayers();

  const visibleNotes = filteredNotes();
  elements.scheduleGroups.innerHTML = "";

  if (!visibleNotes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = notes.length
      ? "No items match this view."
      : "No scheduled work yet. Load schedules from the controls on the right.";
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

  const seriesRange = note.seriesStart && note.seriesEnd ? `${formatShortDate(note.seriesStart)}-${formatShortDate(note.seriesEnd)}` : "";
  const tags = [
    relativeDueLabel(note),
    seriesRange ? `Series ${seriesRange}` : note.seriesStart ? `Series ${formatShortDate(note.seriesStart)}` : "",
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

function renderPlayers() {
  elements.playerList.innerHTML = "";
  const sorted = [...players].sort((a, b) => `${a.level}-${a.team}-${a.name}`.localeCompare(`${b.level}-${b.team}-${b.name}`));

  sorted.forEach((player) => {
    const row = document.createElement("article");
    row.className = "player-card";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(player.name)}</strong>
        <span>${escapeHtml(player.team)} | ${player.level} | ${player.role} | ID ${player.teamId || "missing"}</span>
        <span>${player.upload ? "auto-upload" : "local only"}${player.manual ? " | manual notes" : ""}</span>
      </div>
      <div class="player-actions">
        <button class="icon-action" type="button" data-action="edit">Edit</button>
        <button class="icon-action delete-action" type="button" data-action="delete">Delete</button>
      </div>
    `;

    row.querySelector('[data-action="edit"]').addEventListener("click", () => startEditingPlayer(player));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deletePlayer(player));
    elements.playerList.append(row);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
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

function sportIdForLevel(level) {
  return level === "AAA" ? 11 : 1;
}

async function getTeams() {
  if (teamCache) return teamCache;
  const response = await fetch(TEAMS_URL);
  if (!response.ok) throw new Error(`Team lookup failed (${response.status})`);
  const data = await response.json();
  teamCache = data.teams || [];
  return teamCache;
}

async function resolveTeamId(team, level) {
  const teams = await getTeams();
  const sportId = sportIdForLevel(level);
  const normalized = team.trim().toUpperCase();
  const match = teams.find((item) => item.sport?.id === sportId && item.abbreviation?.toUpperCase() === normalized);
  return match?.id || null;
}

async function handlePlayerSubmit(event) {
  event.preventDefault();

  const id = elements.playerIdInput.value || crypto.randomUUID();
  const level = elements.playerLevelInput.value;
  const team = elements.playerTeamInput.value.trim().toUpperCase();
  let teamId = elements.playerTeamIdInput.value ? Number(elements.playerTeamIdInput.value) : null;

  if (!teamId && team) {
    try {
      teamId = await resolveTeamId(team, level);
    } catch {
      teamId = null;
    }
  }

  const player = normalizePlayer({
    id,
    name: elements.playerNameInput.value.trim(),
    team,
    teamId,
    level,
    role: elements.playerRoleInput.value,
    upload: elements.playerUploadInput.checked,
    manual: elements.playerManualInput.checked,
  });

  const existing = players.some((item) => item.id === id);
  players = existing ? players.map((item) => (item.id === id ? player : item)) : [...players, player];
  savePlayers();
  resetPlayerForm();
  render();
}

function startEditingPlayer(player) {
  elements.playerIdInput.value = player.id;
  elements.playerNameInput.value = player.name;
  elements.playerTeamInput.value = player.team;
  elements.playerTeamIdInput.value = player.teamId || "";
  elements.playerLevelInput.value = player.level;
  elements.playerRoleInput.value = player.role;
  elements.playerUploadInput.checked = player.upload;
  elements.playerManualInput.checked = player.manual;
  elements.cancelPlayerEditButton.classList.remove("hidden");
  elements.playerNameInput.focus();
}

function deletePlayer(player) {
  const confirmed = window.confirm(`Remove ${player.name} from the tracked roster?`);
  if (!confirmed) return;
  players = players.filter((item) => item.id !== player.id);
  savePlayers();
  render();
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

async function handleScheduleSubmit(event) {
  event.preventDefault();
  await loadSchedulesFromApi();
}

async function loadSchedulesFromApi() {
  const startDate = elements.scheduleStartInput.value;
  const endDate = addDays(startDate, Number(elements.lookaheadInput.value));
  const leadDays = Number(elements.leadDaysInput.value);
  const dueTime = elements.scheduleDueTimeInput.value;
  const includeAuto = elements.includeAutoInput.checked;
  const includeManual = elements.includeManualInput.checked;
  const filteredPlayers = getPlayersForSchedule();
  const teams = groupPlayersByTeam(filteredPlayers);
  const created = [];
  const failures = [];

  if (!filteredPlayers.length) {
    setApiStatus("No players match that team filter.");
    return;
  }

  setApiStatus(`Loading schedules for ${teams.length} team${teams.length === 1 ? "" : "s"}...`);
  setScheduleLoading(true);

  try {
    for (const teamGroup of teams) {
      try {
        const schedule = await fetchTeamSchedule(teamGroup, startDate, endDate);
        const seriesList = extractSeries(schedule, teamGroup.teamId);
        seriesList.forEach((series) => {
          teamGroup.players.forEach((player) => {
            if (includeAuto) created.push(buildAutoReportTask(player, series, leadDays, dueTime));
            if (includeManual && player.manual) created.push(buildManualTask(player, series, leadDays, dueTime));
          });
        });
      } catch (error) {
        failures.push(`${teamGroup.team} ${teamGroup.level}: ${error.message}`);
      }
    }

    const uniqueTasks = created.filter((task) => !isDuplicateTask(task));
    notes = [...notes, ...uniqueTasks];
    saveNotes();
    render();

    const skipped = created.length - uniqueTasks.length;
    const failureText = failures.length ? ` ${failures.length} team${failures.length === 1 ? "" : "s"} failed.` : "";
    setApiStatus(`Added ${uniqueTasks.length} item${uniqueTasks.length === 1 ? "" : "s"} from schedules. Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.${failureText}`);
  } finally {
    setScheduleLoading(false);
  }
}

function getPlayersForSchedule() {
  const filter = elements.scheduleTeamFilterInput.value.trim().toUpperCase();
  if (!filter) return players;

  return players.filter(
    (player) =>
      player.team === filter ||
      String(player.teamId || "") === filter ||
      player.name.toUpperCase().includes(filter),
  );
}

function groupPlayersByTeam(sourcePlayers) {
  const groups = new Map();
  sourcePlayers.forEach((player) => {
    const key = `${player.level}-${player.teamId || player.team}`;
    const current = groups.get(key) || {
      level: player.level,
      sportId: sportIdForLevel(player.level),
      team: player.team,
      teamId: player.teamId,
      players: [],
    };
    current.players.push(player);
    groups.set(key, current);
  });
  return [...groups.values()];
}

async function fetchTeamSchedule(teamGroup, startDate, endDate) {
  let teamId = teamGroup.teamId;
  if (!teamId) {
    teamId = await resolveTeamId(teamGroup.team, teamGroup.level);
    if (!teamId) throw new Error("missing team ID");
  }

  const params = new URLSearchParams({
    sportId: String(teamGroup.sportId),
    teamId: String(teamId),
    startDate,
    endDate,
  });
  const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`);
  if (!response.ok) throw new Error(`schedule failed (${response.status})`);
  return response.json();
}

function extractSeries(schedule, teamId) {
  const games = (schedule.dates || [])
    .flatMap((date) => date.games || [])
    .filter((game) => game.gameType === "R" && isTeamGame(game, teamId))
    .sort((a, b) => a.officialDate.localeCompare(b.officialDate));
  const grouped = new Map();

  games.forEach((game) => {
    const opponent = getOpponent(game, teamId);
    if (!opponent) return;
    const side = game.teams.home.team.id === teamId ? "vs" : "at";
    const seriesNumber = game.teams.home.team.id === teamId ? game.teams.home.seriesNumber : game.teams.away.seriesNumber;
    const key = `${teamId}-${opponent.id}-${seriesNumber || game.officialDate}`;
    const current = grouped.get(key) || {
      key,
      teamId,
      opponentId: opponent.id,
      opponent: `${side} ${opponent.name}`,
      startDate: game.officialDate,
      endDate: game.officialDate,
      firstSeriesGameNumber: game.seriesGameNumber || 1,
      games: 0,
    };

    current.startDate = current.startDate < game.officialDate ? current.startDate : game.officialDate;
    current.endDate = current.endDate > game.officialDate ? current.endDate : game.officialDate;
    current.games += 1;
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .filter((series) => series.firstSeriesGameNumber === 1)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function isTeamGame(game, teamId) {
  return game.teams?.home?.team?.id === teamId || game.teams?.away?.team?.id === teamId;
}

function getOpponent(game, teamId) {
  if (game.teams.home.team.id === teamId) return game.teams.away.team;
  if (game.teams.away.team.id === teamId) return game.teams.home.team;
  return null;
}

function buildAutoReportTask(player, series, leadDays, dueTime) {
  const roleLabel = player.role === "hitter" ? "hitter scouting report" : "pitcher scouting report";
  const uploadMode = player.upload ? "auto-upload" : "local-only";
  const dueDate = addDays(series.startDate, -leadDays);
  return normalizeNote({
    id: crypto.randomUUID(),
    type: "auto",
    player: player.name,
    playerId: player.id,
    team: player.team,
    teamId: player.teamId,
    role: player.role,
    level: player.level,
    opponent: series.opponent,
    opponentId: series.opponentId,
    seriesStart: series.startDate,
    seriesEnd: series.endDate,
    seriesKey: series.key,
    uploadMode,
    title: `${player.name} ${roleLabel} ${series.opponent}`,
    recipient: player.upload ? "Auto-upload queue" : "Local review",
    destination: player.upload ? "build/pdf upload queue" : "build/pdf local only",
    dueDate,
    dueTime,
    repeat: "none",
    details: `${series.games}-game series ${series.opponent}, ${formatShortDate(series.startDate)}-${formatShortDate(series.endDate)}. Pre-series PDF output: build/pdf/YYYY-MM-DD/Player vs Opponent.pdf. ${player.upload ? "Uploader should send this automatically." : "Upload is off, so confirm whether this needs manual delivery."}`,
    made: false,
    sent: false,
    sentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function buildManualTask(player, series, leadDays, dueTime) {
  const dueDate = addDays(series.startDate, -leadDays);
  return normalizeNote({
    id: crypto.randomUUID(),
    type: "manual",
    player: player.name,
    playerId: player.id,
    team: player.team,
    teamId: player.teamId,
    role: player.role,
    level: player.level,
    opponent: series.opponent,
    opponentId: series.opponentId,
    seriesStart: series.startDate,
    seriesEnd: series.endDate,
    seriesKey: series.key,
    uploadMode: "manual-send",
    title: `${player.name} handwritten notes ${series.opponent}`,
    recipient: "Manual send list",
    destination: "Handwritten notes",
    dueDate,
    dueTime,
    repeat: "none",
    details: `Handwritten notes for ${player.name}. Must be made and sent by ${dueDate}, before the ${formatShortDate(series.startDate)} series starts.`,
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
      note.playerId === task.playerId &&
      note.seriesKey === task.seriesKey &&
      note.type === task.type &&
      note.uploadMode === task.uploadMode,
  );
}

function setApiStatus(message) {
  elements.apiStatus.textContent = message;
}

function setScheduleLoading(isLoading) {
  elements.loadSchedulesButton.disabled = isLoading;
  elements.scheduleForm.querySelector("button[type='submit']").disabled = isLoading;
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
elements.scheduleForm.addEventListener("submit", handleScheduleSubmit);
elements.playerForm.addEventListener("submit", handlePlayerSubmit);
elements.cancelEditButton.addEventListener("click", resetForm);
elements.cancelPlayerEditButton.addEventListener("click", resetPlayerForm);
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.loadSchedulesButton.addEventListener("click", () => elements.scheduleForm.requestSubmit());

resetForm();
resetPlayerForm();
resetScheduleForm();
render();
setInterval(render, 60_000);
