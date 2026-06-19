const NOTE_STORAGE_KEY = "notes-schedule-items-v4";
const PLAYER_STORAGE_KEY = "notes-schedule-players-v1";
const LAST_SYNC_KEY = "notes-schedule-last-sync-v1";
const LEGACY_NOTE_KEYS = ["notes-schedule-items-v3", "notes-schedule-items-v2", "notes-schedule-items-v1"];
const TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams?sportIds=1,11&activeStatus=Y";
const AUTO_LOOKAHEAD_DAYS = 21;
const DEFAULT_LEAD_DAYS = 3;
const DEFAULT_DUE_TIME = "09:00";

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
  apiStatus: document.querySelector("#apiStatus"),
  refreshSchedulesButton: document.querySelector("#refreshSchedulesButton"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  scheduleGroups: document.querySelector("#scheduleGroups"),
  noteTemplate: document.querySelector("#noteTemplate"),
  dashboardTab: document.querySelector("#dashboardTab"),
  playersTab: document.querySelector("#playersTab"),
  dashboardPage: document.querySelector("#dashboardPage"),
  playersPage: document.querySelector("#playersPage"),
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
    autoSynced: false,
    ...note,
  };
}

function stablePlayerId(name) {
  const slug = String(name || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `player-${slug || crypto.randomUUID()}`;
}

function saveNotes() {
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
}

function savePlayers() {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
}

function todayDateInputValue() {
  return formatDateInput(new Date());
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

function combineDateTime(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue || DEFAULT_DUE_TIME}:00`);
}

function isBeforeToday(dateValue) {
  return dateValue < todayDateInputValue();
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

  const now = new Date();
  const today = todayDateInputValue();
  if (note.dueDate < today) return "overdue";
  if (note.dueDate === today) return "today";

  const due = combineDateTime(note.dueDate, note.dueTime);
  const soonCutoff = new Date(now);
  soonCutoff.setHours(soonCutoff.getHours() + 72);
  if (due <= soonCutoff) return "soon";

  return "upcoming";
}

function relativeDueLabel(note) {
  const due = combineDateTime(note.dueDate, note.dueTime);
  if (isSameDay(due, new Date())) {
    return `Today, ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatter.format(due);
}

function formatShortDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function switchPage(pageName) {
  const showPlayers = pageName === "players";
  elements.playersPage.classList.toggle("active", showPlayers);
  elements.dashboardPage.classList.toggle("active", !showPlayers);
  elements.playersTab.classList.toggle("active", showPlayers);
  elements.dashboardTab.classList.toggle("active", !showPlayers);
}

function filteredNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filter = elements.statusFilter.value;

  return notes
    .filter((note) => {
      const status = dueStatus(note);
      const haystack = [note.title, note.player, note.team, note.role, note.level, note.opponent, note.details]
        .join(" ")
        .toLowerCase();
      const matchesQuery = haystack.includes(query);
      const matchesStatus =
        filter === "all" ||
        (filter === "active" && ["overdue", "today", "soon"].includes(status)) ||
        filter === status ||
        (filter === "auto" && note.type === "auto") ||
        (filter === "manual" && note.type === "manual");
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime));
}

function updateStats() {
  const counts = notes.reduce(
    (totals, note) => {
      totals[dueStatus(note)] += 1;
      return totals;
    },
    { overdue: 0, today: 0, soon: 0, upcoming: 0, sent: 0 },
  );

  const manualCount = players.filter((player) => player.manual).length;
  elements.overdueCount.textContent = counts.overdue;
  elements.todayCount.textContent = counts.today;
  elements.upcomingCount.textContent = counts.soon;
  elements.sentCount.textContent = counts.sent;
  elements.rosterSummary.textContent = `${players.length} players, ${manualCount} manual-note players`;

  if (!notes.length) {
    elements.summaryText.textContent = "No scheduled work yet. Schedules sync automatically.";
  } else if (counts.overdue) {
    elements.summaryText.textContent = `${counts.overdue} overdue item${counts.overdue === 1 ? "" : "s"}.`;
  } else if (counts.today) {
    elements.summaryText.textContent = `${counts.today} item${counts.today === 1 ? "" : "s"} due today.`;
  } else if (counts.soon) {
    elements.summaryText.textContent = `${counts.soon} item${counts.soon === 1 ? "" : "s"} due in the next 72 hours.`;
  } else {
    elements.summaryText.textContent = "Nothing urgent right now.";
  }
}

function render() {
  updateClock();
  updateStats();
  renderPlayers();
  renderNotes();
}

function renderNotes() {
  const visibleNotes = filteredNotes();
  elements.scheduleGroups.innerHTML = "";

  if (!visibleNotes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = notes.length ? "No items match this view." : "No scheduled work yet.";
    elements.scheduleGroups.append(empty);
    return;
  }

  const focusGroups = [
    ["overdue", "Overdue"],
    ["today", "Due today"],
    ["soon", "Next 72 hours"],
  ];
  const allGroups = [
    ...focusGroups,
    ["upcoming", "Later"],
    ["sent", "Done"],
  ];
  const groups = elements.statusFilter.value === "active" ? focusGroups : allGroups;

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
  const deleteAction = node.querySelector(".delete-action");

  node.classList.toggle("overdue", status === "overdue");
  node.classList.toggle("sent", status === "sent");
  node.classList.toggle("manual", note.type === "manual");

  title.textContent = compactTitle(note);
  pill.textContent = statusLabel(status);
  pill.classList.add(status);

  const seriesRange = note.seriesStart && note.seriesEnd ? `${formatShortDate(note.seriesStart)}-${formatShortDate(note.seriesEnd)}` : "";
  const reportType = note.type === "manual" ? "manual notes" : `${note.role || "report"} report`;
  meta.textContent = [relativeDueLabel(note), note.team, note.opponent, seriesRange, reportType].filter(Boolean).join(" | ");
  details.textContent = note.type === "manual" ? "Handwritten notes." : uploadLabel(note);

  madeAction.textContent = note.made ? madeDoneLabel(note) : madeTodoLabel(note);
  sentAction.textContent = note.sent ? sentDoneLabel(note) : sentTodoLabel(note);
  madeAction.classList.toggle("done", note.made);
  sentAction.classList.toggle("done", note.sent);

  madeAction.addEventListener("click", () => updateNote(note.id, { made: !note.made }));
  sentAction.addEventListener("click", () => toggleSent(note));
  deleteAction.addEventListener("click", () => deleteNote(note));

  return node;
}

function compactTitle(note) {
  const type = note.type === "manual" ? "Notes" : note.role === "pitcher" ? "Pitcher report" : "Hitter report";
  return `${note.player || note.title} ${type}${note.opponent ? ` ${note.opponent}` : ""}`;
}

function statusLabel(status) {
  return { overdue: "Overdue", today: "Today", soon: "Soon", upcoming: "Later", sent: "Done" }[status];
}

function uploadLabel(note) {
  if (note.uploadMode === "auto-upload") return "Auto-upload";
  if (note.uploadMode === "local-only") return "Local only";
  if (note.uploadMode === "manual-send") return "Manual send";
  return "";
}

function madeTodoLabel(note) {
  return note.type === "auto" ? "Generated?" : "Made?";
}

function madeDoneLabel(note) {
  return note.type === "auto" ? "Generated" : "Made";
}

function sentTodoLabel(note) {
  if (note.uploadMode === "auto-upload") return "Uploaded?";
  if (note.uploadMode === "local-only") return "Cleared?";
  return "Sent?";
}

function sentDoneLabel(note) {
  if (note.uploadMode === "auto-upload") return "Uploaded";
  if (note.uploadMode === "local-only") return "Cleared";
  return "Sent";
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

async function getTeams() {
  if (teamCache) return teamCache;
  const response = await fetch(TEAMS_URL);
  if (!response.ok) throw new Error(`Team lookup failed (${response.status})`);
  const data = await response.json();
  teamCache = data.teams || [];
  return teamCache;
}

function sportIdForLevel(level) {
  return level === "AAA" ? 11 : 1;
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
  autoSyncSchedules({ force: true });
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
  switchPage("players");
}

function deletePlayer(player) {
  const confirmed = window.confirm(`Remove ${player.name} from the tracked roster?`);
  if (!confirmed) return;
  players = players.filter((item) => item.id !== player.id);
  savePlayers();
  render();
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

async function autoSyncSchedules({ force = false } = {}) {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (!force && lastSync && Number(lastSync) > oneHourAgo && notes.length) {
    elements.apiStatus.textContent = `Synced ${new Date(Number(lastSync)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    return;
  }

  elements.apiStatus.textContent = "Syncing...";
  elements.refreshSchedulesButton.disabled = true;

  try {
    prunePastAutoTasks();
    const created = [];
    const startDate = todayDateInputValue();
    const endDate = addDays(startDate, AUTO_LOOKAHEAD_DAYS);
    const teams = groupPlayersByTeam(players);

    for (const teamGroup of teams) {
      const schedule = await fetchTeamSchedule(teamGroup, startDate, endDate);
      const seriesList = extractSeries(schedule, teamGroup.teamId);
      seriesList.forEach((series) => {
        teamGroup.players.forEach((player) => {
          const autoTask = buildAutoReportTask(player, series);
          if (autoTask) created.push(autoTask);
          if (player.manual) {
            const manualTask = buildManualTask(player, series);
            if (manualTask) created.push(manualTask);
          }
        });
      });
    }

    const uniqueTasks = created.filter((task) => !isDuplicateTask(task));
    notes = [...notes, ...uniqueTasks];
    saveNotes();
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    elements.apiStatus.textContent = uniqueTasks.length ? `Synced, ${uniqueTasks.length} new` : "Synced";
  } catch (error) {
    elements.apiStatus.textContent = "Sync failed. Using saved tasks.";
  } finally {
    elements.refreshSchedulesButton.disabled = false;
    render();
  }
}

function prunePastAutoTasks() {
  notes = notes.filter((note) => {
    if (note.sent) return true;
    if (!note.seriesKey && note.type !== "auto" && !note.autoSynced) return true;
    return !isBeforeToday(note.dueDate);
  });
  saveNotes();
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
  return [...groups.values()].filter((group) => group.teamId || group.team);
}

async function fetchTeamSchedule(teamGroup, startDate, endDate) {
  let teamId = teamGroup.teamId;
  if (!teamId) teamId = await resolveTeamId(teamGroup.team, teamGroup.level);
  if (!teamId) throw new Error("missing team ID");

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
    current.firstSeriesGameNumber = Math.min(current.firstSeriesGameNumber, game.seriesGameNumber || 1);
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

function buildAutoReportTask(player, series) {
  const dueDate = addDays(series.startDate, -DEFAULT_LEAD_DAYS);
  if (isBeforeToday(dueDate)) return null;

  const roleLabel = player.role === "hitter" ? "hitter" : "pitcher";
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
    uploadMode: player.upload ? "auto-upload" : "local-only",
    autoSynced: true,
    title: `${player.name} ${roleLabel} report ${series.opponent}`,
    dueDate,
    dueTime: DEFAULT_DUE_TIME,
    repeat: "none",
    details: "",
    made: false,
    sent: false,
    sentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function buildManualTask(player, series) {
  const dueDate = addDays(series.startDate, -DEFAULT_LEAD_DAYS);
  if (isBeforeToday(dueDate)) return null;

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
    autoSynced: true,
    title: `${player.name} notes ${series.opponent}`,
    dueDate,
    dueTime: DEFAULT_DUE_TIME,
    repeat: "none",
    details: "",
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
  updateNote(note.id, { sent: true, made: true, sentAt: new Date().toISOString() });
}

function deleteNote(note) {
  const confirmed = window.confirm(`Delete "${compactTitle(note)}"?`);
  if (!confirmed) return;
  notes = notes.filter((item) => item.id !== note.id);
  saveNotes();
  render();
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

elements.dashboardTab.addEventListener("click", () => switchPage("dashboard"));
elements.playersTab.addEventListener("click", () => switchPage("players"));
elements.refreshSchedulesButton.addEventListener("click", () => autoSyncSchedules({ force: true }));
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.playerForm.addEventListener("submit", handlePlayerSubmit);
elements.cancelPlayerEditButton.addEventListener("click", resetPlayerForm);

resetPlayerForm();
prunePastAutoTasks();
render();
autoSyncSchedules();
setInterval(render, 60_000);
