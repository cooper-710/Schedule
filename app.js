const STORAGE_KEY = "notes-schedule-items-v1";

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
  form: document.querySelector("#noteForm"),
  formTitle: document.querySelector("#formTitle"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  noteId: document.querySelector("#noteId"),
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
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function todayDateInputValue() {
  const today = new Date();
  return formatDateInput(today);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  elements.dateInput.value = todayDateInputValue();
  elements.timeInput.value = "09:00";
  elements.repeatInput.value = "none";
  elements.formTitle.textContent = "Add note";
  elements.cancelEditButton.classList.add("hidden");
}

function groupFilteredNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filter = elements.statusFilter.value;

  return notes
    .filter((note) => {
      const haystack = [note.title, note.recipient, note.destination, note.details].join(" ").toLowerCase();
      const matchesQuery = haystack.includes(query);
      const status = dueStatus(note);
      const matchesStatus =
        filter === "all" || (filter === "active" && status !== "sent") || filter === status;
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
    { overdue: 0, today: 0, upcoming: 0, sent: 0 },
  );

  elements.overdueCount.textContent = counts.overdue;
  elements.todayCount.textContent = counts.today;
  elements.upcomingCount.textContent = counts.upcoming;
  elements.sentCount.textContent = counts.sent;

  if (!notes.length) {
    elements.summaryText.textContent = "Add the notes you need to make and send.";
  } else if (counts.overdue) {
    elements.summaryText.textContent = `${counts.overdue} item${counts.overdue === 1 ? "" : "s"} overdue.`;
  } else if (counts.today) {
    elements.summaryText.textContent = `${counts.today} item${counts.today === 1 ? "" : "s"} due today.`;
  } else {
    elements.summaryText.textContent = "Nothing urgent right now.";
  }
}

function render() {
  updateClock();
  updateStats();

  const filtered = groupFilteredNotes();
  elements.scheduleGroups.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = notes.length
      ? "No notes match this view."
      : "No notes scheduled yet. Add your first one on the right.";
    elements.scheduleGroups.append(empty);
    return;
  }

  const groups = [
    ["overdue", "Overdue"],
    ["today", "Due today"],
    ["upcoming", "Upcoming"],
    ["sent", "Sent"],
  ];

  groups.forEach(([status, label]) => {
    const groupNotes = filtered.filter((note) => dueStatus(note) === status);
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

  title.textContent = note.title;
  pill.textContent = statusLabel(status);
  pill.classList.add(status);

  const recipient = note.recipient ? `To ${note.recipient}` : "No recipient";
  const destination = note.destination ? `via ${note.destination}` : "No destination";
  const repeat = note.repeat === "none" ? "" : ` • repeats ${note.repeat}`;
  meta.textContent = `${relativeDueLabel(note)} • ${recipient} ${destination}${repeat}`;

  details.textContent = note.details || "No prep notes added.";
  madeAction.textContent = note.made ? "Made" : "Mark made";
  sentAction.textContent = note.sent ? "Sent" : "Mark sent";
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
    upcoming: "Upcoming",
    sent: "Sent",
  };
  return labels[status];
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
  elements.titleInput.value = note.title;
  elements.recipientInput.value = note.recipient;
  elements.destinationInput.value = note.destination;
  elements.dateInput.value = note.dueDate;
  elements.timeInput.value = note.dueTime;
  elements.repeatInput.value = note.repeat;
  elements.detailsInput.value = note.details;
  elements.madeInput.checked = note.made;
  elements.sentInput.checked = note.sent;
  elements.formTitle.textContent = "Edit note";
  elements.cancelEditButton.classList.remove("hidden");
  elements.titleInput.focus();
}

function handleSubmit(event) {
  event.preventDefault();

  const id = elements.noteId.value || crypto.randomUUID();
  const existing = notes.find((note) => note.id === id);
  const now = new Date().toISOString();
  const note = {
    id,
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
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existing) {
    notes = notes.map((item) => (item.id === id ? note : item));
  } else {
    notes = [...notes, note];
  }

  saveNotes();
  resetForm();
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

elements.form.addEventListener("submit", handleSubmit);
elements.cancelEditButton.addEventListener("click", resetForm);
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.quickAddButton.addEventListener("click", () => elements.titleInput.focus());

resetForm();
render();
setInterval(render, 60_000);
