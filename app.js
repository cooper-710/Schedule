import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

const NOTE_STORAGE_KEY = "notes-schedule-items-v5";
const PLAYER_STORAGE_KEY = "notes-schedule-players-v1";
const LAST_SYNC_KEY = "notes-schedule-last-sync-v1";
const SCHEDULE_VERSION_KEY = "notes-schedule-version-v1";
const CURRENT_SCHEDULE_VERSION = `season-through-october-${new Date().getFullYear()}-v2`;
const LEGACY_NOTE_KEYS = ["notes-schedule-items-v4", "notes-schedule-items-v3", "notes-schedule-items-v2", "notes-schedule-items-v1"];
const TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams?sportIds=1,11&activeStatus=Y";
const DEFAULT_LEAD_DAYS = 3;
const DEFAULT_DUE_TIME = "09:00";
const REVIEW_DUE_TIME = "07:00";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  cloudPanelButton: document.querySelector("#cloudPanelButton"),
  cloudModal: document.querySelector("#cloudModal"),
  cloudCloseButton: document.querySelector("#cloudCloseButton"),
  cloudStatusLabel: document.querySelector("#cloudStatusLabel"),
  cloudAccountLabel: document.querySelector("#cloudAccountLabel"),
  cloudGoogleButton: document.querySelector("#cloudGoogleButton"),
  cloudLogoutButton: document.querySelector("#cloudLogoutButton"),
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
  calendarTab: document.querySelector("#calendarTab"),
  listTab: document.querySelector("#listTab"),
  playersTab: document.querySelector("#playersTab"),
  calendarPage: document.querySelector("#calendarPage"),
  listPage: document.querySelector("#listPage"),
  playersPage: document.querySelector("#playersPage"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarSummary: document.querySelector("#calendarSummary"),
  calendarUrgentStrip: document.querySelector("#calendarUrgentStrip"),
  monthLabel: document.querySelector("#monthLabel"),
  todayButton: document.querySelector("#todayButton"),
  nextSevenButton: document.querySelector("#nextSevenButton"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  manualOnlyToggle: document.querySelector("#manualOnlyToggle"),
  calendarDetailMode: document.querySelector("#calendarDetailMode"),
  calendarDetailTitle: document.querySelector("#calendarDetailTitle"),
  calendarDetailSummary: document.querySelector("#calendarDetailSummary"),
  calendarDetailList: document.querySelector("#calendarDetailList"),
  calendarDetailClose: document.querySelector("#calendarDetailClose"),
  playerList: document.querySelector("#playerList"),
  addPlayerButton: document.querySelector("#addPlayerButton"),
  playerModal: document.querySelector("#playerModal"),
  playerFormTitle: document.querySelector("#playerFormTitle"),
  playerForm: document.querySelector("#playerForm"),
  playerIdInput: document.querySelector("#playerIdInput"),
  playerNameInput: document.querySelector("#playerNameInput"),
  playerTeamInput: document.querySelector("#playerTeamInput"),
  playerLevelInput: document.querySelector("#playerLevelInput"),
  playerRoleInput: document.querySelector("#playerRoleInput"),
  playerUploadInput: document.querySelector("#playerUploadInput"),
  playerManualInput: document.querySelector("#playerManualInput"),
  cancelPlayerEditButton: document.querySelector("#cancelPlayerEditButton"),
};

let notes = loadNotes();
let players = loadPlayers();
let teamCache = null;
let calendarMonth = new Date();
calendarMonth.setDate(1);
calendarMonth.setHours(12, 0, 0, 0);
let calendarSelection = {
  mode: "day",
  date: todayDateInputValue(),
};
let calendarDetailOpen = false;
let calendarManualOnly = false;
let currentUser = null;
let cloudSaveTimer = null;
let isLoadingCloudState = false;
let cloudReady = false;

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
    archived: false,
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
  queueCloudSave();
}

function savePlayers() {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
  queueCloudSave();
}

function setCloudStatus(message, shortMessage = message) {
  if (elements.cloudStatusLabel) elements.cloudStatusLabel.textContent = shortMessage;
  if (elements.cloudAccountLabel) elements.cloudAccountLabel.textContent = message;
}

function setCloudReady(ready) {
  cloudReady = ready;
  document.body.classList.toggle("sync-locked", !ready);
}

function openCloudPanel() {
  elements.cloudModal.classList.add("open");
}

function closeCloudPanel() {
  if (!cloudReady) return;
  elements.cloudModal.classList.remove("open");
}

async function initializeCloudSync() {
  setCloudReady(false);
  openCloudPanel();
  setCloudStatus("Checking login...", "Checking");
  const { data } = await supabase.auth.getSession();
  await handleSession(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });
}

async function handleSession(session) {
  currentUser = session?.user || null;
  elements.cloudGoogleButton.classList.toggle("hidden", Boolean(currentUser));
  elements.cloudLogoutButton.classList.toggle("hidden", !currentUser);

  if (!currentUser) {
    setCloudReady(false);
    openCloudPanel();
    setCloudStatus("Sign in to open your schedule.", "Login");
    return;
  }

  setCloudReady(false);
  openCloudPanel();
  setCloudStatus(`Loading ${currentUser.email || "account"}...`, "Loading");
  await loadCloudState();
}

async function loadCloudState() {
  if (!currentUser) return;
  isLoadingCloudState = true;

  try {
    const { data, error } = await supabase
      .from("schedule_app_state")
      .select("players, notes, schedule_version, last_sync")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const saved = await saveCloudStateNow();
      if (!saved) throw new Error("Initial cloud save failed");
      setCloudReady(true);
      closeCloudPanel();
      setCloudStatus(`Logged in as ${currentUser.email || "your account"}`, "Ready");
      return;
    }

    players = Array.isArray(data.players) ? data.players.map(normalizePlayer) : DEFAULT_PLAYERS.map(normalizePlayer);
    notes = Array.isArray(data.notes) ? data.notes.map(normalizeNote) : [];
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
    if (data.schedule_version) localStorage.setItem(SCHEDULE_VERSION_KEY, data.schedule_version);
    if (data.last_sync) localStorage.setItem(LAST_SYNC_KEY, String(data.last_sync));
    setCloudReady(true);
    closeCloudPanel();
    setCloudStatus(`Logged in as ${currentUser.email || "your account"}`, "Ready");
    render();
  } catch (error) {
    setCloudReady(false);
    openCloudPanel();
    setCloudStatus("Could not load your schedule. Refresh or sign in again.", "Load failed");
  } finally {
    isLoadingCloudState = false;
  }
}

function queueCloudSave() {
  if (!currentUser || isLoadingCloudState) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    saveCloudStateNow();
  }, 500);
}

async function saveCloudStateNow() {
  if (!currentUser) return false;

  const payload = {
    user_id: currentUser.id,
    players,
    notes,
    schedule_version: localStorage.getItem(SCHEDULE_VERSION_KEY) || CURRENT_SCHEDULE_VERSION,
    last_sync: Number(localStorage.getItem(LAST_SYNC_KEY) || Date.now()),
  };

  const { error } = await supabase.from("schedule_app_state").upsert(payload, { onConflict: "user_id" });
  if (error) {
    setCloudReady(false);
    openCloudPanel();
    setCloudStatus("Could not save your schedule. Refresh or sign in again.", "Save failed");
    return false;
  }
  setCloudStatus(`Saved at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, "Saved");
  return true;
}

async function handleGoogleLogin() {
  setCloudStatus("Opening Google sign-in...", "Google");
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    setCloudStatus(`Google sign-in failed: ${error.message}`, "Failed");
  }
}

async function handleCloudLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  setCloudReady(false);
  openCloudPanel();
  setCloudStatus("Sign in to open your schedule.", "Login");
  elements.cloudGoogleButton.classList.remove("hidden");
  elements.cloudLogoutButton.classList.add("hidden");
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
  if (note.archived) return "hidden";

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
  const showCalendar = pageName === "calendar";
  const showList = pageName === "list";
  const showPlayers = pageName === "players";
  elements.calendarPage.classList.toggle("active", showCalendar);
  elements.listPage.classList.toggle("active", showList);
  elements.playersPage.classList.toggle("active", showPlayers);
  elements.calendarTab.classList.toggle("active", showCalendar);
  elements.listTab.classList.toggle("active", showList);
  elements.playersTab.classList.toggle("active", showPlayers);
}

function filteredNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filter = elements.statusFilter.value;

  return notes
    .filter((note) => {
      const status = dueStatus(note);
      const isArchived = Boolean(note.archived);
      const haystack = [note.title, note.player, note.team, note.role, note.level, note.opponent, note.details]
        .join(" ")
        .toLowerCase();
      const matchesQuery = haystack.includes(query);
      const matchesStatus =
        (filter === "hidden" && isArchived) ||
        (filter === "sent" && !isArchived && note.sent) ||
        (filter === "all" && !isArchived) ||
        (filter === "active" && !isArchived && ["overdue", "today", "soon"].includes(status)) ||
        filter === status ||
        (filter === "auto" && !isArchived && note.type === "auto") ||
        (filter === "manual" && !isArchived && note.type === "manual");
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime));
}

function updateStats() {
  const visibleNotes = notes.filter((note) => !note.archived);
  const outstandingNotes = visibleNotes.filter((note) => !note.sent);
  const counts = outstandingNotes.reduce(
    (totals, note) => {
      totals[dueStatus(note)] += 1;
      return totals;
    },
    { overdue: 0, today: 0, soon: 0, upcoming: 0 },
  );

  const manualCount = players.filter((player) => player.manual).length;
  elements.overdueCount.textContent = counts.overdue;
  elements.todayCount.textContent = counts.today;
  elements.upcomingCount.textContent = counts.soon;
  elements.sentCount.textContent = visibleNotes.filter((note) => note.sent).length;
  elements.rosterSummary.textContent = `${players.length} players, ${manualCount} manual-note players`;

  if (!visibleNotes.length) {
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
  renderCalendar();
  renderCalendarDetail();
}

function renderCalendar() {
  elements.calendarGrid.innerHTML = "";
  elements.monthLabel.textContent = calendarMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const visibleNotes = notes.filter((note) => !note.archived);
  const calendarNotes = calendarManualOnly ? visibleNotes.filter((note) => note.type === "manual") : visibleNotes;
  const outstanding = calendarNotes.filter((note) => !note.sent);
  const month = calendarMonth.getMonth();
  const year = calendarMonth.getFullYear();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  renderCalendarUrgent(calendarNotes);
  elements.manualOnlyToggle.classList.toggle("active", calendarManualOnly);
  elements.manualOnlyToggle.setAttribute("aria-pressed", String(calendarManualOnly));

  const monthNotes = calendarNotes.filter((note) => {
    const due = new Date(`${note.dueDate}T12:00:00`);
    return due.getMonth() === month && due.getFullYear() === year;
  });
  const monthOutstanding = monthNotes.filter((note) => !note.sent).length;
  elements.calendarSummary.textContent = monthOutstanding
    ? `${monthOutstanding} open ${calendarManualOnly ? "manual " : ""}item${monthOutstanding === 1 ? "" : "s"} this month.`
    : `Nothing open ${calendarManualOnly ? "manual " : ""}this month.`;

  const spacer = document.createElement("div");
  spacer.className = "calendar-weekday week-spacer";
  elements.calendarGrid.append(spacer);
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-weekday";
    header.textContent = day;
    elements.calendarGrid.append(header);
  });

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateValue = formatDateInput(date);
    const weekStart = startOfWeek(dateValue);
    const isSelectedDay = calendarSelection.mode === "day" && calendarSelection.date === dateValue;
    const isSelectedWeek = calendarSelection.mode === "week" && calendarSelection.date === weekStart;
    const isSelectedRange = calendarSelection.mode === "range" && datesInSelectedRange().includes(dateValue);
    const dayNotes = calendarNotes
      .filter((note) => note.dueDate === dateValue)
      .sort(compareCalendarNotes);

    if (index % 7 === 0) {
      elements.calendarGrid.append(renderWeekSummary(weekStart, calendarNotes));
    }

    const openDayNotes = dayNotes.filter((note) => !note.sent);
    const sentCount = dayNotes.length - openDayNotes.length;
    const reportCount = openDayNotes.filter((note) => note.type !== "manual").length;
    const cell = document.createElement("article");
    cell.className = "calendar-day";
    cell.classList.toggle("outside-month", date.getMonth() !== month);
    cell.classList.toggle("today", dateValue === todayDateInputValue());
    cell.classList.toggle("selected", isSelectedDay);
    cell.classList.toggle("selected-week", isSelectedWeek);
    cell.classList.toggle("selected-range", isSelectedRange);
    cell.addEventListener("click", () => openCalendarDay(dateValue));

    const openCount = openDayNotes.length;
    cell.innerHTML = `
      <div class="calendar-day-head">
        <button class="calendar-date-button" type="button">${date.getDate()}</button>
        ${openCount ? `<strong>${openCount}</strong>` : ""}
      </div>
      <div class="calendar-items"></div>
    `;

    if (date.getDay() === 0) {
      const weekButton = document.createElement("button");
      weekButton.className = "calendar-week-button";
      weekButton.type = "button";
      weekButton.textContent = "Week";
      weekButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openCalendarWeek(weekStart);
      });
      cell.querySelector(".calendar-day-head").prepend(weekButton);
    }

    const itemList = cell.querySelector(".calendar-items");
    const visibleOpenNotes = openDayNotes.slice(0, 5);
    visibleOpenNotes.forEach((note) => {
      const item = document.createElement("button");
      item.className = "calendar-item";
      item.classList.toggle("manual", note.type === "manual");
      item.type = "button";
      item.textContent = calendarItemLabel(note);
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        openCalendarDay(dateValue);
      });
      itemList.append(item);
    });

    const hiddenReports = reportCount - visibleOpenNotes.filter((note) => note.type !== "manual").length;
    if (hiddenReports > 0) {
      const more = document.createElement("span");
      more.className = "calendar-more";
      more.textContent = `+${hiddenReports} report${hiddenReports === 1 ? "" : "s"}`;
      itemList.append(more);
    }

    if (sentCount > 0) {
      const done = document.createElement("span");
      done.className = "calendar-done";
      done.textContent = `${sentCount} done`;
      itemList.append(done);
    }

    elements.calendarGrid.append(cell);
  }

  const openTotal = outstanding.length;
  elements.calendarTab.title = `${openTotal} open scheduled item${openTotal === 1 ? "" : "s"}`;
}

function renderCalendarUrgent(sourceNotes) {
  const today = todayDateInputValue();
  const tomorrow = addDays(today, 1);
  const nextThreeDates = [today, tomorrow, addDays(today, 2)];
  const openNotes = sourceNotes.filter((note) => !note.sent);
  const todayCount = openNotes.filter((note) => note.dueDate === today).length;
  const tomorrowCount = openNotes.filter((note) => note.dueDate === tomorrow).length;
  const nextThreeCount = openNotes.filter((note) => nextThreeDates.includes(note.dueDate)).length;

  elements.calendarUrgentStrip.innerHTML = `
    <button type="button" data-range="today"><span>Today</span><strong>${todayCount}</strong></button>
    <button type="button" data-range="tomorrow"><span>Tomorrow</span><strong>${tomorrowCount}</strong></button>
    <button type="button" data-range="next3"><span>Next 3 days</span><strong>${nextThreeCount}</strong></button>
  `;

  elements.calendarUrgentStrip.querySelector('[data-range="today"]').addEventListener("click", () => openCalendarDay(today));
  elements.calendarUrgentStrip.querySelector('[data-range="tomorrow"]').addEventListener("click", () => openCalendarDay(tomorrow));
  elements.calendarUrgentStrip.querySelector('[data-range="next3"]').addEventListener("click", () => openCalendarRange(today, 3, "Next 3 days"));
}

function renderWeekSummary(weekStart, sourceNotes) {
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekNotes = sourceNotes.filter((note) => !note.sent && weekDates.includes(note.dueDate));
  const manualCount = weekNotes.filter((note) => note.type === "manual").length;
  const summary = document.createElement("button");
  summary.className = "calendar-week-summary";
  summary.type = "button";
  summary.innerHTML = `
    <span>Week of ${formatShortDate(weekStart)}</span>
    <strong>${weekNotes.length} open</strong>
    <em>${manualCount} handwritten</em>
  `;
  summary.addEventListener("click", () => openCalendarWeek(weekStart));
  return summary;
}

function calendarItemLabel(note) {
  if (note.type === "review") return note.title || "Hitter reviews";
  const type = note.type === "manual" ? "Notes" : note.role === "pitcher" ? "Pitcher" : "Hitter";
  return `${note.player || note.title} · ${type}`;
}

function compareCalendarNotes(a, b) {
  const dateOrder = a.dueDate.localeCompare(b.dueDate);
  if (dateOrder) return dateOrder;

  const sentOrder = Number(a.sent) - Number(b.sent);
  if (sentOrder) return sentOrder;

  const manualOrder = Number(b.type === "manual") - Number(a.type === "manual");
  if (manualOrder) return manualOrder;

  const timeOrder = (a.dueTime || DEFAULT_DUE_TIME).localeCompare(b.dueTime || DEFAULT_DUE_TIME);
  if (timeOrder) return timeOrder;

  return compactTitle(a).localeCompare(compactTitle(b));
}

function selectCalendarDay(dateValue) {
  calendarSelection = { mode: "day", date: dateValue };
  const selectedDate = new Date(`${dateValue}T12:00:00`);
  calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
  renderCalendar();
}

function selectCalendarWeek(weekStart) {
  calendarSelection = { mode: "week", date: weekStart };
  const selectedDate = new Date(`${weekStart}T12:00:00`);
  calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
  renderCalendar();
}

function openCalendarDay(dateValue) {
  calendarDetailOpen = true;
  selectCalendarDay(dateValue);
  renderCalendarDetail();
}

function openCalendarWeek(weekStart) {
  calendarDetailOpen = true;
  selectCalendarWeek(weekStart);
  renderCalendarDetail();
}

function openCalendarRange(startDate, days, label) {
  calendarSelection = { mode: "range", date: startDate, days, label };
  const selectedDate = new Date(`${startDate}T12:00:00`);
  calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
  calendarDetailOpen = true;
  renderCalendar();
  renderCalendarDetail();
}

function closeCalendarDetail() {
  calendarDetailOpen = false;
  renderCalendarDetail();
}

function startOfWeek(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return formatDateInput(date);
}

function datesInSelectedRange() {
  if (calendarSelection.mode === "day") return [calendarSelection.date];
  const dates = [];
  const dayCount = calendarSelection.mode === "range" ? calendarSelection.days : 7;
  for (let index = 0; index < dayCount; index += 1) {
    dates.push(addDays(calendarSelection.date, index));
  }
  return dates;
}

function renderCalendarDetail() {
  if (!calendarDetailOpen) {
    document.querySelector(".calendar-detail")?.classList.remove("open");
    return;
  }

  document.querySelector(".calendar-detail")?.classList.add("open");
  const selectedDates = datesInSelectedRange();
  const selectedNotes = notes
    .filter((note) => !note.archived && selectedDates.includes(note.dueDate))
    .sort(compareCalendarNotes);
  const openCount = selectedNotes.filter((note) => !note.sent).length;

  if (calendarSelection.mode === "day") {
    elements.calendarDetailMode.textContent = "Day";
    elements.calendarDetailTitle.textContent = new Date(`${calendarSelection.date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } else {
    const start = new Date(`${calendarSelection.date}T12:00:00`);
    const dayCount = calendarSelection.mode === "range" ? calendarSelection.days : 7;
    const end = new Date(`${addDays(calendarSelection.date, dayCount - 1)}T12:00:00`);
    elements.calendarDetailMode.textContent = calendarSelection.mode === "range" ? "Range" : "Week";
    elements.calendarDetailTitle.textContent =
      calendarSelection.label ||
      `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }

  elements.calendarDetailSummary.textContent = selectedNotes.length
    ? `${openCount} open, ${selectedNotes.length - openCount} crossed off`
    : "No work scheduled.";
  elements.calendarDetailList.innerHTML = "";

  if (!selectedNotes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.textContent = "Nothing scheduled here.";
    elements.calendarDetailList.append(empty);
    return;
  }

  selectedNotes.forEach((note) => {
    elements.calendarDetailList.append(renderNote(note));
  });
}

function renderNotes() {
  const visibleNotes = filteredNotes();
  elements.scheduleGroups.innerHTML = "";

  if (!visibleNotes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      elements.statusFilter.value === "hidden"
        ? "No removed items."
        : notes.length
          ? "No items match this view."
          : "No scheduled work yet.";
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
    ["hidden", "Removed"],
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
  const archiveAction = node.querySelector(".archive-action");

  node.classList.toggle("overdue", status === "overdue");
  node.classList.toggle("sent", note.sent);
  node.classList.toggle("manual", note.type === "manual");
  node.classList.toggle("archived", note.archived);

  title.textContent = compactTitle(note);
  pill.textContent = statusLabel(status);
  pill.classList.add(status);

  const seriesRange = note.seriesStart && note.seriesEnd ? `${formatShortDate(note.seriesStart)}-${formatShortDate(note.seriesEnd)}` : "";
  const reportType = note.type === "manual" ? "handwritten notes" : note.type === "review" ? "hitter reviews" : `${note.role || "report"} report`;
  meta.textContent = [relativeDueLabel(note), note.team, note.opponent, seriesRange, reportType].filter(Boolean).join(" | ");
  details.textContent = detailsLabel(note);

  madeAction.textContent = note.made ? madeDoneLabel(note) : madeTodoLabel(note);
  sentAction.textContent = note.sent ? sentDoneLabel(note) : sentTodoLabel(note);
  madeAction.classList.toggle("done", note.made);
  sentAction.classList.toggle("done", note.sent);

  madeAction.addEventListener("click", () => updateNote(note.id, { made: !note.made }));
  sentAction.addEventListener("click", () => toggleSent(note));
  if (archiveAction) {
    archiveAction.textContent = note.archived ? "Restore" : "Remove";
    archiveAction.classList.toggle("hidden", !note.sent && !note.archived);
    archiveAction.addEventListener("click", () => toggleArchive(note));
  }
  if (deleteAction) {
    deleteAction.classList.add("hidden");
  }

  return node;
}

function compactTitle(note) {
  if (note.type === "review") return note.title || "Hitter reviews";
  if (note.type === "manual") {
    return `Handwritten notes: ${note.player || note.title}${note.opponent ? ` ${note.opponent}` : ""}`;
  }
  const type = note.role === "pitcher" ? "Pitcher report" : "Hitter report";
  return `${note.player || note.title} ${type}${note.opponent ? ` ${note.opponent}` : ""}`;
}

function statusLabel(status) {
  return { overdue: "Overdue", today: "Today", soon: "Soon", upcoming: "Later", hidden: "Removed" }[status];
}

function detailsLabel(note) {
  if (note.archived) return "Removed from the main dashboard. Use Restore to bring it back.";
  if (note.sent) {
    const sentTime = note.sentAt
      ? new Date(note.sentAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "";
    return sentTime ? `Crossed off ${sentTime}.` : "Crossed off.";
  }
  if (note.type === "review") return note.details || "Review hitter breakdowns, then mark sent.";
  if (note.type === "manual") return "Handwritten note. Write it, then send it.";
  return "Generated report. Mark it ready, then sent.";
}

function madeTodoLabel(note) {
  if (note.type === "review") return "Mark reviewed";
  return note.type === "auto" ? "Mark generated" : "Mark written";
}

function madeDoneLabel(note) {
  if (note.type === "review") return "Undo reviewed";
  if (note.type === "auto") return "Undo generated";
  return "Undo written";
}

function sentTodoLabel(note) {
  return "Mark sent";
}

function sentDoneLabel() {
  return "Undo sent";
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
        <span>${escapeHtml(player.team)} | ${player.level} | ${player.role}</span>
        <span>${player.manual ? "handwritten notes" : "reports only"}</span>
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
  let teamId = null;

  try {
    teamId = await resolveTeamId(team, level);
  } catch {
    teamId = existingPlayerTeamId(id);
  }

  const player = normalizePlayer({
    id,
    name: elements.playerNameInput.value.trim(),
    team,
    teamId,
    level,
    role: elements.playerRoleInput.value,
    upload: existingPlayerUpload(id),
    manual: elements.playerManualInput.checked,
  });

  const existing = players.some((item) => item.id === id);
  players = existing ? players.map((item) => (item.id === id ? player : item)) : [...players, player];
  savePlayers();
  render();
  closePlayerModal();
  await autoSyncSchedules({ force: true });
}

function startEditingPlayer(player) {
  elements.playerIdInput.value = player.id;
  elements.playerNameInput.value = player.name;
  elements.playerTeamInput.value = player.team;
  elements.playerLevelInput.value = player.level;
  elements.playerRoleInput.value = player.role;
  if (elements.playerUploadInput) elements.playerUploadInput.checked = player.upload;
  elements.playerManualInput.checked = player.manual;
  elements.playerFormTitle.textContent = "Edit player";
  openPlayerModal();
  elements.playerNameInput.focus();
  switchPage("players");
}

async function deletePlayer(player) {
  const confirmed = window.confirm(`Remove ${player.name} from the tracked roster?`);
  if (!confirmed) return;
  players = players.filter((item) => item.id !== player.id);
  savePlayers();
  render();
  await autoSyncSchedules({ force: true });
}

function openNewPlayerModal() {
  resetPlayerForm();
  elements.playerFormTitle.textContent = "Add player";
  openPlayerModal();
  elements.playerNameInput.focus();
}

function openPlayerModal() {
  elements.playerModal.classList.add("open");
}

function closePlayerModal() {
  elements.playerModal.classList.remove("open");
  resetPlayerForm();
}

function resetPlayerForm() {
  elements.playerForm.reset();
  elements.playerIdInput.value = "";
  elements.playerLevelInput.value = "MLB";
  elements.playerRoleInput.value = "hitter";
  if (elements.playerUploadInput) elements.playerUploadInput.checked = false;
  elements.playerManualInput.checked = false;
}

function existingPlayerUpload(id) {
  const existing = players.find((player) => player.id === id);
  return existing ? existing.upload : false;
}

function existingPlayerTeamId(id) {
  const existing = players.find((player) => player.id === id);
  return existing?.teamId || null;
}

async function autoSyncSchedules({ force = false } = {}) {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  const scheduleVersion = localStorage.getItem(SCHEDULE_VERSION_KEY);
  if (!force && scheduleVersion === CURRENT_SCHEDULE_VERSION && notes.length) {
    elements.apiStatus.textContent = lastSync
      ? `Season loaded ${new Date(Number(lastSync)).toLocaleDateString([], { month: "short", day: "numeric" })}`
      : "Season loaded";
    return;
  }

  elements.apiStatus.textContent = "Building season calendar...";
  if (elements.refreshSchedulesButton) elements.refreshSchedulesButton.disabled = true;

  try {
    prunePastAutoTasks({ rebuild: force || scheduleVersion !== CURRENT_SCHEDULE_VERSION });
    const created = [];
    const startDate = todayDateInputValue();
    const endDate = seasonEndDate(startDate);
    const teams = groupPlayersByTeam(players);

    created.push(...buildHitterReviewTasks(startDate, endDate, players));

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
    localStorage.setItem(SCHEDULE_VERSION_KEY, CURRENT_SCHEDULE_VERSION);
    elements.apiStatus.textContent = uniqueTasks.length ? `Season loaded, ${uniqueTasks.length} new` : "Season loaded";
  } catch (error) {
    elements.apiStatus.textContent = "Season load failed. Using saved tasks.";
  } finally {
    if (elements.refreshSchedulesButton) elements.refreshSchedulesButton.disabled = false;
    render();
  }
}

function seasonEndDate(startDate) {
  const year = Number(startDate.slice(0, 4));
  return `${year}-10-31`;
}

function prunePastAutoTasks({ rebuild = false } = {}) {
  notes = notes.filter((note) => {
    if (note.sent) return true;
    if (note.archived) return true;
    if (rebuild && note.autoSynced) return false;
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

function buildHitterReviewTasks(startDate, endDate, sourcePlayers) {
  const hitterCount = sourcePlayers.filter((player) => player.role === "hitter").length;
  if (!hitterCount) return [];

  const tasks = [];
  for (let dateValue = startDate; dateValue <= endDate; dateValue = addDays(dateValue, 1)) {
    const date = new Date(`${dateValue}T12:00:00`);
    if (date.getDay() !== 0) continue;

    const weekEnd = addDays(dateValue, -1);
    const weekStart = addDays(weekEnd, -6);
    tasks.push(buildHitterReviewTask({
      dateValue,
      hitterCount,
      reviewKind: "weekly",
      title: "Weekly hitter reviews",
      rangeText: `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`,
    }));

    if (isFirstSunday(dateValue)) {
      const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1, 12);
      const monthLabel = previousMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      tasks.push(buildHitterReviewTask({
        dateValue,
        hitterCount,
        reviewKind: "monthly",
        title: "Monthly hitter reviews",
        rangeText: monthLabel,
      }));
    }
  }
  return tasks;
}

function buildHitterReviewTask({ dateValue, hitterCount, reviewKind, title, rangeText }) {
  return normalizeNote({
    id: crypto.randomUUID(),
    type: "review",
    player: "Hitters",
    playerId: `hitter-review-${reviewKind}`,
    role: "hitter",
    level: "ALL",
    seriesStart: dateValue,
    seriesEnd: dateValue,
    seriesKey: `hitter-review-${reviewKind}-${dateValue}`,
    uploadMode: `hitter-${reviewKind}`,
    autoSynced: true,
    title,
    dueDate: dateValue,
    dueTime: REVIEW_DUE_TIME,
    repeat: reviewKind,
    details: `${hitterCount} tracked hitter${hitterCount === 1 ? "" : "s"} | ${rangeText}`,
    made: false,
    sent: false,
    sentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function isFirstSunday(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.getDay() === 0 && date.getDate() <= 7;
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

function toggleArchive(note) {
  updateNote(note.id, { archived: !note.archived });
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

elements.calendarTab.addEventListener("click", () => switchPage("calendar"));
elements.listTab.addEventListener("click", () => switchPage("list"));
elements.playersTab.addEventListener("click", () => switchPage("players"));
elements.todayButton.addEventListener("click", () => openCalendarDay(todayDateInputValue()));
elements.nextSevenButton.addEventListener("click", () => openCalendarRange(todayDateInputValue(), 7, "Next 7 days"));
elements.manualOnlyToggle.addEventListener("click", () => {
  calendarManualOnly = !calendarManualOnly;
  renderCalendar();
  if (calendarDetailOpen) renderCalendarDetail();
});
elements.prevMonthButton.addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});
elements.nextMonthButton.addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});
elements.calendarDetailClose.addEventListener("click", closeCalendarDetail);
if (elements.refreshSchedulesButton) {
  elements.refreshSchedulesButton.addEventListener("click", () => autoSyncSchedules({ force: true }));
}
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.cloudGoogleButton.addEventListener("click", handleGoogleLogin);
elements.cloudLogoutButton.addEventListener("click", handleCloudLogout);
elements.cloudPanelButton.addEventListener("click", openCloudPanel);
elements.cloudCloseButton.addEventListener("click", closeCloudPanel);
elements.cloudModal.addEventListener("click", (event) => {
  if (event.target === elements.cloudModal) closeCloudPanel();
});
elements.addPlayerButton.addEventListener("click", openNewPlayerModal);
elements.playerForm.addEventListener("submit", handlePlayerSubmit);
elements.cancelPlayerEditButton.addEventListener("click", closePlayerModal);
elements.playerModal.addEventListener("click", (event) => {
  if (event.target === elements.playerModal) closePlayerModal();
});
document.addEventListener("pointerdown", (event) => {
  if (!calendarDetailOpen) return;
  if (event.target instanceof Element && event.target.closest(".calendar-detail")) return;
  closeCalendarDetail();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCalendarDetail();
    closePlayerModal();
    closeCloudPanel();
  }

  if (!calendarDetailOpen || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
  event.preventDefault();
  const offset = event.key === "ArrowLeft" ? -1 : 1;
  if (calendarSelection.mode === "week") {
    openCalendarWeek(addDays(calendarSelection.date, offset * 7));
    return;
  }
  openCalendarDay(addDays(calendarSelection.date, offset));
});

async function startApp() {
  resetPlayerForm();
  render();
  await initializeCloudSync();
  if (cloudReady) {
    prunePastAutoTasks();
    await autoSyncSchedules();
  }
  setInterval(updateClock, 1_000);
  setInterval(render, 60_000);
}

startApp();
